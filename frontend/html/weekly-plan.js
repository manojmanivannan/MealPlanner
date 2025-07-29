document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealSlots = ["pre_breakfast", "breakfast", "lunch", "snack", "dinner"];
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
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds })
            });
            weeklyPlan[day][meal] = recipeIds;
            // No need to fetch, just re-render with the new state
            renderPlanner(); 
        } catch (error) {
            console.error('Error saving weekly plan slot:', error);
        }
    }

    const plannerGrid = document.getElementById('meal-plan-grid');

    function renderPlanner() {
        const plannerHTML = daysOfWeek.map((day, idx) => {
            // Object to hold the total nutrition for the day
            const dayTotals = { protein: 0, carbs: 0, fat: 0, fiber: 0, energy: 0 };

            const mealsHTML = mealSlots.map(meal => {
                let recipeIds = weeklyPlan[day]?.[meal] || [];
                if (!Array.isArray(recipeIds)) recipeIds = recipeIds ? [recipeIds] : [];
                
                const mealNutrition = { protein: 0, carbs: 0, fat: 0, fiber: 0, energy: 0 };

                const recipeDetails = recipeIds.map(rid => {
                    const recipe = recipes.find(r => r.id === rid);
                    if (recipe) {
                        // Add this recipe's nutrition to the meal's total
                        mealNutrition.protein += recipe.protein || 0;
                        mealNutrition.carbs += recipe.carbs || 0;
                        mealNutrition.fat += recipe.fat || 0;
                        mealNutrition.fiber += recipe.fiber || 0;
                        mealNutrition.energy += recipe.energy || 0;
                    }
                    return recipe;
                }).filter(Boolean); // Filter out any nulls if a recipe wasn't found

                // Add the meal's nutrition to the day's grand total
                dayTotals.protein += mealNutrition.protein;
                dayTotals.carbs += mealNutrition.carbs;
                dayTotals.fat += mealNutrition.fat;
                dayTotals.fiber += mealNutrition.fiber;
                dayTotals.energy += mealNutrition.energy;

                const recipeNameSpans = recipeDetails.map(recipe => 
                    `<span class='font-extrabold text-base text-teal-800 cursor-pointer hover:underline recipe-link' data-recipe-id='${recipe.id}'>${recipe.name}</span>`
                ).join(', ');
                
                // HTML for the meal's nutrition breakdown
                const mealNutritionHTML = recipeIds.length > 0 ? `
                    <div class="ml-2 mt-1 text-stone-500">
                    <p class="text-[9px] text-gray-450">
                        E: ${mealNutrition.energy.toFixed(0)}kcal | Pr: ${mealNutrition.protein.toFixed(1)}g | Ca: ${mealNutrition.carbs.toFixed(1)}g | Fa: ${mealNutrition.fat.toFixed(1)}g | Fb: ${mealNutrition.fiber.toFixed(0)}g
                    </p>
                    </div>
                ` : '';

                return `
                    <div class="mb-2">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-xs text-stone-500 capitalize">${meal}</span>
                            <button class="text-xs px-2 py-1 rounded font-semibold transition ${recipeIds.length ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}" type="button" onclick="window.selectRecipeForSlot('${day}','${meal}')">${recipeIds.length ? 'Change' : 'Add'}</button>
                        </div>
                        <div class="ml-2 recipe-names-container">
                            ${recipeNameSpans || '<span class="text-stone-400">No recipe</span>'}
                        </div>
                        ${mealNutritionHTML}
                    </div>
                `;
            }).join('');

            // HTML for the day's total nutrition footer
            const dayTotalNutritionHTML = `
                <div class="mt-auto pt-2 border-t border-stone-300/50 text-center">
                    <!--<h7 class="font-bold text-sm text-teal-900">Day Total</h7>-->
                    <p class="text-xs text-stone-700 text-gray-500">
                        <strong>Energy:</strong> ${dayTotals.energy.toFixed(0)} kcal<br>
                        <strong>Pr:</strong> ${dayTotals.protein.toFixed(1)}g | 
                        <strong>Ca:</strong> ${dayTotals.carbs.toFixed(1)}g | 
                        <strong>Fa:</strong> ${dayTotals.fat.toFixed(1)}g | 
                        <strong>Fb:</strong> ${dayTotals.fiber.toFixed(1)}g
                    </p>
                </div>
            `;

            // The main card structure, using flexbox to push the footer to the bottom
            return `
                <div class="meal-card ${dayBgClass[idx]} flex flex-col p-3">
                    <h4 class="text-lg font-bold card-title mb-2 text-center">${day}</h4>
                    <div class="flex-grow">
                        ${mealsHTML}
                    </div>
                    ${dayTotalNutritionHTML}
                </div>
            `;
        }).join('');
        
        plannerGrid.innerHTML = plannerHTML;

        // Re-attach event listeners for recipe links
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
        if (meal === 'pre_breakfast') {
            filtered = recipes.filter(r => r.meal_type === 'pre_breakfast');
        } else if (meal === 'snack') {
            filtered = recipes.filter(r => r.meal_type === 'snack');
        } else {
            filtered = recipes.filter(r => !['pre_breakfast', 'snack'].includes(r.meal_type));
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
        let ingr = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(i => `${i.quantity} ${i.serving_unit} ${i.name}`).join('; ') : '';
        ingr = ingr.replace(/\n/g, '<br>');

        // Safely access nutrition data with defaults
        const energy = recipe.energy || 0;
        const protein = recipe.protein || 0;
        const carbs = recipe.carbs || 0;
        const fat = recipe.fat || 0;
        const fiber = recipe.fiber || 0;

        const modalHTML = `
            <div id="recipe-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative" onclick="event.stopPropagation()">
                    <button class="absolute top-2 right-2 text-2xl text-stone-400 hover:text-stone-700" onclick="document.getElementById('recipe-detail-modal').remove()">&times;</button>
                    <h2 class="text-2xl font-bold mb-2 text-teal-800">${recipe.name}</h2>
                    <div class="mb-2"><span class="font-semibold">Ingredients:</span><br>${ingr}</div>
                    <div class="mb-2"><span class="font-semibold">Instructions:</span><br>${instr}</div>
                    <div class="mt-2 text-xs text-stone-500">Meal type: ${recipe.meal_type}</div>
                    <div class="mt-4 pt-3 border-t">
                        <h3 class="font-semibold mb-1">Nutrition:</h3>
                        <p class="text-sm text-stone-700">
                            <strong>Energy:</strong> ${energy.toFixed(0)} kcal<br>
                            <strong>Protein:</strong> ${protein.toFixed(1)}g | 
                            <strong>Carbs:</strong> ${carbs.toFixed(1)}g | 
                            <strong>Fat:</strong> ${fat.toFixed(1)}g | 
                            <strong>Fiber:</strong> ${fiber.toFixed(1)}g
                        </p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const overlay = document.getElementById('recipe-detail-modal');
        overlay.addEventListener('click', () => overlay.remove());
    };

    fetchRecipes();
});