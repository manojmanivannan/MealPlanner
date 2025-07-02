document.addEventListener('DOMContentLoaded', () => {
    const hubContent = document.getElementById('hub-content');
    const hubTabsContainer = document.getElementById('hub-tabs');
    let recipes = [];
    let activeCategory = '🍳 Breakfast';

    const API_BASE = '/api';

    const mealTypeMap = {
        '🍳 Breakfast': ['breakfast'],
        '🍲 Lunch & Dinner': ['lunch', 'dinner'],
        '🥜 Snacks': ['snack'],
        '🗓️ Weekend Prep': ['weekend prep'],
        '🥗 Sides': ['sides']
    };

    const renderRecipes = () => {
        const filteredRecipes = recipes.filter(r => mealTypeMap[activeCategory]?.includes(r.meal_type));
        hubContent.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                ${filteredRecipes.map(recipe => `
                    <div class="bg-stone-50 p-3 rounded-lg border border-stone-200 meal-card-enter">
                        <h5 class="font-bold text-sm text-teal-800">${recipe.name}</h5>
                        <p class="text-xs text-stone-600 mt-1">${recipe.instructions}</p>
                        <p class="text-xs text-stone-500 mt-1"><span class="font-semibold">Ingredients:</span> ${recipe.ingredients}</p>
                        <div class="mt-2 flex justify-end space-x-2">
                            <button class="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 transition" onclick="editRecipe(${recipe.id})">Edit</button>
                            <button class="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition" onclick="deleteRecipe(${recipe.id})">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4">
                <button id="add-recipe-btn" class="bg-green-100 text-green-700 font-semibold px-4 py-2 rounded-lg hover:bg-green-200 transition">Add New Recipe</button>
            </div>
        `;

        document.getElementById('add-recipe-btn').addEventListener('click', () => showRecipeModal());
    };

    const fetchRecipes = async () => {
        try {
            const response = await fetch(`${API_BASE}/recipes`);
            recipes = await response.json();
            renderRecipes();
            fetchWeeklyPlan(); // fetch planner after recipes are loaded
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    };

    hubTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('hub-tab')) {
            hubTabsContainer.querySelectorAll('.hub-tab').forEach(tab => tab.classList.remove('active-tab', 'text-orange-900'));
            e.target.classList.add('active-tab', 'text-orange-900');
            activeCategory = e.target.textContent;
            renderRecipes();
        }
    });

    window.editRecipe = (id) => {
        const recipe = recipes.find(r => r.id === id);
        if (recipe) {
            showRecipeModal(recipe);
        }
    };

    window.deleteRecipe = async (id) => {
        if (confirm('Are you sure you want to delete this recipe?')) {
            try {
                await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE' });
                recipes = recipes.filter(r => r.id !== id);
                renderRecipes();
            } catch (error) {
                console.error('Error deleting recipe:', error);
            }
        }
    };

    const showRecipeModal = (recipe = null) => {
        const modalHTML = `
            <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h2 class="text-2xl font-bold mb-4">${recipe ? 'Edit' : 'Add'} Recipe</h2>
                    <form id="recipe-form">
                        <input type="hidden" id="recipe-id" value="${recipe ? recipe.id : ''}">
                        <div class="mb-4">
                            <label for="recipe-name" class="block text-sm font-medium text-stone-700">Name</label>
                            <input type="text" id="recipe-name" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${recipe ? recipe.name : ''}" required>
                        </div>
                        <div class="mb-4">
                            <label for="recipe-ingredients" class="block text-sm font-medium text-stone-700">Ingredients</label>
                            <textarea id="recipe-ingredients" rows="4" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" required>${recipe ? recipe.ingredients : ''}</textarea>
                        </div>
                        <div class="mb-4">
                            <label for="recipe-instructions" class="block text-sm font-medium text-stone-700">Instructions</label>
                            <textarea id="recipe-instructions" rows="4" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" required>${recipe ? recipe.instructions : ''}</textarea>
                        </div>
                        <div class="mb-4">
                            <label for="recipe-meal-type" class="block text-sm font-medium text-stone-700">Meal Type</label>
                            <select id="recipe-meal-type" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" required>
                                <option value="breakfast" ${recipe && recipe.meal_type === 'breakfast' ? 'selected' : ''}>Breakfast</option>
                                <option value="lunch" ${recipe && recipe.meal_type === 'lunch' ? 'selected' : ''}>Lunch</option>
                                <option value="dinner" ${recipe && recipe.meal_type === 'dinner' ? 'selected' : ''}>Dinner</option>
                                <option value="snack" ${recipe && recipe.meal_type === 'snack' ? 'selected' : ''}>Snack</option>
                                <option value="weekend prep" ${recipe && recipe.meal_type === 'weekend prep' ? 'selected' : ''}>Weekend Prep</option>
                                <option value="sides" ${recipe && recipe.meal_type === 'sides' ? 'selected' : ''}>Sides</option>
                            </select>
                        </div>
                        <div class="flex justify-end space-x-4">
                            <button type="button" id="cancel-btn" class="bg-stone-200 text-stone-800 px-4 py-2 rounded-lg hover:bg-stone-300">Cancel</button>
                            <button type="submit" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">${recipe ? 'Save Changes' : 'Add Recipe'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const overlay = document.getElementById('recipe-modal');
        overlay.addEventListener('click', () => overlay.remove());
        overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());

        document.getElementById('recipe-form').addEventListener('submit', saveRecipe);
        document.getElementById('cancel-btn').addEventListener('click', () => document.getElementById('recipe-modal').remove());
    };

    const saveRecipe = async (e) => {
        e.preventDefault();
        const id = document.getElementById('recipe-id').value;
        const name = document.getElementById('recipe-name').value;
        const ingredients = document.getElementById('recipe-ingredients').value;
        const instructions = document.getElementById('recipe-instructions').value;
        const meal_type = document.getElementById('recipe-meal-type').value;

        const recipeData = { name, ingredients, instructions, meal_type };

        try {
            if (id) { // Edit
                const response = await fetch(`${API_BASE}/recipes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recipeData)
                });
                const updatedRecipe = await response.json();
                const index = recipes.findIndex(r => r.id == id);
                recipes[index] = updatedRecipe;
            } else { // Add
                const response = await fetch(`${API_BASE}/recipes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recipeData)
                });
                const newRecipe = await response.json();
                recipes.push(newRecipe);
            }
            renderRecipes();
            document.getElementById('recipe-modal').remove();
            renderShoppingList(); // Refresh shopping list after save
        } catch (error) {
            console.error('Error saving recipe:', error);
        }
    };

    // --- Weekly Planner Logic ---
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealSlots = ["breakfast", "lunch", "snack", "dinner"];
    let weeklyPlan = {};

    async function fetchWeeklyPlan() {
        try {
            const response = await fetch(`${API_BASE}/weekly-plan`);
            weeklyPlan = await response.json();
            renderPlanner();
        } catch (error) {
            console.error('Error fetching weekly plan:', error);
        }
    }

    async function saveWeeklyPlanSlot(day, meal, recipeId) {
        try {
            await fetch(`${API_BASE}/weekly-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day, meal_type: meal, recipe_id: recipeId })
            });
            weeklyPlan[day][meal] = recipeId;
            renderPlanner();
        } catch (error) {
            console.error('Error saving weekly plan slot:', error);
        }
    }

    const plannerGrid = document.getElementById('meal-plan-grid');

    function renderPlanner() {
        plannerGrid.innerHTML = daysOfWeek.map(day => `
            <div class="bg-white rounded-lg shadow border border-stone-200 p-2 flex flex-col">
                <h4 class="text-lg font-bold text-orange-900 mb-1 text-center">${day}</h4>
                ${mealSlots.map(meal => {
                    const recipeId = weeklyPlan[day]?.[meal] || null;
                    const recipe = recipes.find(r => r.id === recipeId);
                    return `
                        <div class="mb-2">
                            <div class="flex items-center justify-between">
                                <span class="font-medium text-xs text-stone-500 capitalize">${meal}</span>
                                <button class="text-xs px-2 py-1 rounded font-semibold transition ${recipe ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}" onclick="window.selectRecipeForSlot('${day}','${meal}')">${recipe ? 'Change' : 'Add'}</button>
                            </div>
                            <div class="ml-2">
                                ${recipe ? `<span class='font-extrabold text-base text-teal-800 cursor-pointer hover:underline' onclick='window.showRecipeDetails(${recipe.id})'>${recipe.name}</span>` : '<span class="text-stone-400">No recipe</span>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `).join('');
    }

    window.selectRecipeForSlot = (day, meal) => {
        // Show modal to pick recipe for this meal type
        const filtered = recipes.filter(r => r.meal_type === meal);
        const modalHTML = `
            <div id="select-recipe-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md" onclick="event.stopPropagation()">
                    <h2 class="text-xl font-bold mb-4">Select ${meal.charAt(0).toUpperCase() + meal.slice(1)} for ${day}</h2>
                    <div class="mb-4 max-h-60 overflow-y-auto">
                        ${filtered.length ? filtered.map(r => `
                            <div class="mb-2 flex items-center justify-between border-b pb-1">
                                <span>${r.name}</span>
                                <button class="text-xs bg-teal-600 text-white px-2 py-1 rounded" onclick="window.assignRecipeToSlot('${day}','${meal}',${r.id})">Select</button>
                            </div>
                        `).join('') : '<div class="text-stone-400">No recipes available for this meal type.</div>'}
                    </div>
                    <button class="mt-2 bg-stone-200 text-stone-800 px-4 py-2 rounded-lg hover:bg-stone-300" onclick="document.getElementById('select-recipe-modal').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const overlay = document.getElementById('select-recipe-modal');
        overlay.addEventListener('click', () => overlay.remove());
    };

    window.assignRecipeToSlot = (day, meal, recipeId) => {
        saveWeeklyPlanSlot(day, meal, recipeId);
        document.getElementById('select-recipe-modal').remove();
    };

    window.showRecipeDetails = (id) => {
        if (!id) return;
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;
        const modalHTML = `
            <div id="recipe-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative" onclick="event.stopPropagation()">
                    <button class="absolute top-2 right-2 text-2xl text-stone-400 hover:text-stone-700" onclick="document.getElementById('recipe-detail-modal').remove()">&times;</button>
                    <h2 class="text-2xl font-bold mb-2 text-teal-800">${recipe.name}</h2>
                    <div class="mb-2"><span class="font-semibold">Ingredients:</span><br>${recipe.ingredients}</div>
                    <div class="mb-2"><span class="font-semibold">Instructions:</span><br>${recipe.instructions}</div>
                    <div class="mt-2 text-xs text-stone-500">Meal type: ${recipe.meal_type}</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const overlay = document.getElementById('recipe-detail-modal');
        overlay.addEventListener('click', () => overlay.remove());
    };

    // Make showRecipeModal globally available for inline event handlers
    window.showRecipeModal = showRecipeModal;

    // --- End Weekly Planner Logic ---

    // --- Shopping List Logic ---
    const renderShoppingList = async () => {
        const container = document.getElementById('shopping-list-container');
        try {
            const response = await fetch(`${API_BASE}/ingredients-list`);
            const ingredients = await response.json();
            // Group ingredients by first letter (A-Z)
            const grouped = {};
            ingredients.forEach(ing => {
                const letter = ing.name.charAt(0).toUpperCase();
                if (!grouped[letter]) grouped[letter] = [];
                grouped[letter].push(ing);
            });
            // Only show non-empty sections, sorted alphabetically
            const letters = Object.keys(grouped).sort();
            container.innerHTML = letters.map(letter => `
                <div class="mb-2">
                    <div class="font-bold text-stone-700 text-xs mb-1 pl-1">${letter}</div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                        ${grouped[letter].map(ing => `
                            <label class="flex items-center space-x-1 p-1 bg-stone-50 rounded border border-stone-200 group relative">
                                <input type="checkbox" data-id="${ing.id}" ${ing.available ? 'checked' : ''}>
                                <span class="text-xs">${ing.name}</span>
                                <button type="button" data-id="${ing.id}" class="delete-ingredient-btn absolute right-1 top-1 text-stone-400 hover:text-red-600 text-xs font-bold transition-opacity duration-150" title="Delete">&times;</button>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('') + `
                <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                    <input id="new-ingredient-input" type="text" placeholder="Ingredient..." class="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-teal-500 w-full sm:w-auto">
                    <button id="add-ingredient-btn" class="bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700 text-sm w-full sm:w-auto">Add</button>
                    <button id="regenerate-ingredients-btn" class="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 text-sm w-full sm:w-auto">Regenerate</button>
                </div>
            `;
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const available = e.target.checked;
                    await fetch(`${API_BASE}/ingredients/${id}?available=${available}`, {
                        method: 'PUT'
                    });
                });
            });
            // Delete ingredient logic
            container.querySelectorAll('.delete-ingredient-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (window.confirm('Delete this ingredient?')) {
                        await fetch(`${API_BASE}/ingredients/${id}`, { method: 'DELETE' });
                        renderShoppingList();
                    }
                });
            });
            // Add ingredient logic
            const addBtn = document.getElementById('add-ingredient-btn');
            const input = document.getElementById('new-ingredient-input');
            addBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = input.value.trim();
                if (!name) return;
                addBtn.disabled = true;
                try {
                    const resp = await fetch(`${API_BASE}/ingredients?name=${encodeURIComponent(name)}`, {
                        method: 'POST'
                    });
                    if (resp.ok) {
                        input.value = '';
                        renderShoppingList();
                    } else {
                        console.error('Error adding ingredient:', resp.statusText);
                    }
                } catch (error) {
                    console.error('Error adding ingredient:', error);
                } finally {
                    addBtn.disabled = false;
                }
            });
            // Regenerate ingredients logic
            const regenBtn = document.getElementById('regenerate-ingredients-btn');
            regenBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                regenBtn.disabled = true;
                try {
                    // Get unique ingredients from recipes
                    const resp = await fetch(`${API_BASE}/ingredients`);
                    const uniqueIngredients = await resp.json();
                    // Get current ingredient names (lowercase, trimmed)
                    const current = new Set(ingredients.map(i => i.name.trim().toLowerCase()));
                    // Add missing ones
                    for (const name of uniqueIngredients) {
                        if (!current.has(name.trim().toLowerCase())) {
                            await fetch(`${API_BASE}/ingredients?name=${encodeURIComponent(name)}`, { method: 'POST' });
                        }
                    }
                    renderShoppingList();
                } catch (error) {
                    console.error('Error regenerating ingredients:', error);
                } finally {
                    regenBtn.disabled = false;
                }
            });
        } catch (error) {
            console.error('Error fetching ingredients:', error);
        }
    }

    renderShoppingList(); // Initial render
    fetchRecipes(); // Initial fetch
});