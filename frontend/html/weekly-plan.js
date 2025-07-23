document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealSlots = ["pre-breakfast", "breakfast", "lunch", "snack", "dinner"];
    const dayBgClass = [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];
    let recipes = [];
    let weeklyPlan = {};

    async function fetchRecipes() {
        try {
            const response = await fetch(`${API_BASE}/recipes`);
            recipes = await response.json();
            fetchWeeklyPlan();
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    }

    async function fetchWeeklyPlan() {
        try {
            const response = await fetch(`${API_BASE}/weekly-plan`);
            weeklyPlan = await response.json();
            renderPlanner();
        } catch (error) {
            console.error('Error fetching weekly plan:', error);
        }
    }

    async function saveWeeklyPlanSlot(day, meal, recipeIds) {
        try {
            await fetch(`${API_BASE}/weekly-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds })
            });
            weeklyPlan[day][meal] = recipeIds;
            renderPlanner();
        } catch (error) {
            console.error('Error saving weekly plan slot:', error);
        }
    }

    const plannerGrid = document.getElementById('meal-plan-grid');

    function renderPlanner() {
        plannerGrid.innerHTML = daysOfWeek.map((day, idx) => `
            <div class="meal-card ${dayBgClass[idx]} flex flex-col">
                <h4 class="text-lg font-bold card-title mb-1 text-center">${day}</h4>
                ${mealSlots.map(meal => {
                    let recipeIds = weeklyPlan[day]?.[meal] || [];
                    if (!Array.isArray(recipeIds)) recipeIds = recipeIds ? [recipeIds] : [];
                    const recipeNameSpans = recipeIds.map(rid => {
                        const recipe = recipes.find(r => r.id === rid);
                        return recipe ? `<span class='font-extrabold text-base text-teal-800 cursor-pointer hover:underline recipe-link' data-recipe-id='${recipe.id}'>${recipe.name}</span>` : '';
                    }).filter(Boolean).join(', ');
                    return `
                        <div class="mb-2">
                            <div class="flex items-center justify-between">
                                <span class="font-medium text-xs text-stone-500 capitalize">${meal}</span>
                                <button class="text-xs px-2 py-1 rounded font-semibold transition ${recipeIds.length ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}" type="button" onclick="window.selectRecipeForSlot('${day}','${meal}')">${recipeIds.length ? 'Change' : 'Add'}</button>
                            </div>
                            <div class="ml-2 recipe-names-container">
                                ${recipeNameSpans || '<span class="text-stone-400">No recipe</span>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `).join('');
        plannerGrid.querySelectorAll('.recipe-names-container').forEach(container => {
            container.addEventListener('click', function(e) {
                const target = e.target;
                if (target.classList.contains('recipe-link')) {
                    e.stopPropagation();
                    const id = parseInt(target.getAttribute('data-recipe-id'));
                    window.showRecipeDetails(id);
                }
            });
        });
    }

    window.selectRecipeForSlot = (day, meal) => {
        let filtered = [];
        if (meal === 'pre-breakfast') {
            filtered = recipes.filter(r => r.meal_type === 'pre-breakfast');
        } else if (meal === 'snack') {
            filtered = recipes.filter(r => r.meal_type === 'snack');
        } else {
            filtered = recipes.filter(r => !['pre-breakfast', 'snack'].includes(r.meal_type));
        }
        let selectedIds = weeklyPlan[day]?.[meal] || [];
        if (!Array.isArray(selectedIds)) selectedIds = selectedIds ? [selectedIds] : [];
        const modalHTML = `
            <div id="select-recipe-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md" onclick="event.stopPropagation()">
                    <h2 class="text-xl font-bold mb-4">Select ${meal.charAt(0).toUpperCase() + meal.slice(1)} for ${day}</h2>
                    <form id="multi-recipe-form">
                        <div class="mb-4 max-h-60 overflow-y-auto">
                            ${filtered.length ? filtered.map(r => `
                                <div class="mb-2 flex items-center justify-between border-b pb-1">
                                    <label class="flex items-center space-x-2">
                                        <input type="checkbox" name="recipeIds" value="${r.id}" ${selectedIds.includes(r.id) ? 'checked' : ''}>
                                        <span>${r.name}</span>
                                    </label>
                                </div>
                            `).join('') : '<div class="text-stone-400">No recipes available for this meal type.</div>'}
                        </div>
                        <div class="flex justify-end space-x-2 mt-2">
                            <button type="button" class="bg-stone-200 text-stone-800 px-4 py-2 rounded-lg hover:bg-stone-300" onclick="document.getElementById('select-recipe-modal').remove()">Cancel</button>
                            <button type="submit" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const overlay = document.getElementById('select-recipe-modal');
        overlay.addEventListener('click', () => overlay.remove());
        overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());
        document.getElementById('multi-recipe-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const checked = Array.from(this.elements['recipeIds']).filter(cb => cb.checked).map(cb => parseInt(cb.value));
            window.assignRecipeToSlot(day, meal, checked);
            overlay.remove();
        });
    };

    window.assignRecipeToSlot = (day, meal, recipeIds) => {
        saveWeeklyPlanSlot(day, meal, recipeIds);
    };

    window.showRecipeDetails = (id) => {
        if (!id) return;
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;
        const instr = (recipe.instructions || '').replace(/\n/g, '<br>');
        const ingr = (recipe.ingredients || '').replace(/\n/g, '<br>');
        const modalHTML = `
            <div id="recipe-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative" onclick="event.stopPropagation()">
                    <button class="absolute top-2 right-2 text-2xl text-stone-400 hover:text-stone-700" onclick="document.getElementById('recipe-detail-modal').remove()">&times;</button>
                    <h2 class="text-2xl font-bold mb-2 text-teal-800">${recipe.name}</h2>
                    <div class="mb-2"><span class="font-semibold">Ingredients:</span><br>${ingr}</div>
                    <div class="mb-2"><span class="font-semibold">Instructions:</span><br>${instr}</div>
                    <div class="mt-2 text-xs text-stone-500">Meal type: ${recipe.meal_type}</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const overlay = document.getElementById('recipe-detail-modal');
        overlay.addEventListener('click', () => overlay.remove());
    };

    fetchRecipes();
});
