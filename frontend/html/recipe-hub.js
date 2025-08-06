document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';
    const hubContent = document.getElementById('hub-content');
    const hubTabsContainer = document.getElementById('hub-tabs');
    
    // --- NEW: State and constants from the planner ---
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealSlots = ["pre_breakfast", "breakfast", "lunch", "snack", "dinner"];
    let weeklyPlan = {};
    
    let recipes = [];
    let activeCategory = '🍳 Breakfast';
    let vegFilter = 'both';
    let searchTerm = ''; 

    const mealTypeMap = {
        '☕ Pre-Breakfast': ['pre_breakfast'],
        '🍳 Breakfast': ['breakfast'],
        '🍲 Lunch & Dinner': ['lunch', 'dinner'],
        '🥜 Snacks': ['snack'],
        '🗓️ Weekend Prep': ['weekend_prep'],
        '🥗 Sides': ['sides']
    };

    // --- NEW: Fetches the weekly plan data ---
    async function fetchWeeklyPlan() {
        try {
            const response = await fetch(`${API_BASE}/weekly-plan`);
            weeklyPlan = await response.json();
        } catch (error) {
            console.error('Error fetching weekly plan:', error);
            // Initialize with an empty structure on error
            weeklyPlan = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: {} }), {});
        }
    }

    // --- NEW: Saves an updated meal slot to the server ---
    async function saveWeeklyPlanSlot(day, meal, recipeIds) {
        try {
            await fetch(`${API_BASE}/weekly-plan`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds })
            });
            // Ensure nested structure exists before assignment
            if (!weeklyPlan[day]) {
                weeklyPlan[day] = {};
            }
            weeklyPlan[day][meal] = recipeIds; // Update local state
            alert('Recipe assigned successfully!');
        } catch (error) {
            console.error('Error saving weekly plan slot:', error);
            alert('Failed to assign recipe. Please try again.');
        }
    }
    // --- CHANGE 1: A new function to ONLY handle search filtering ---
    function applySearchFilter() {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const recipeCards = document.querySelectorAll('.recipe-card-container'); // Target the new wrapper
        let visibleCount = 0;

        recipeCards.forEach(card => {
            const recipeName = card.dataset.recipeName.toLowerCase();
            if (recipeName.includes(lowerCaseSearchTerm)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show a message if no recipes match the search
        const noResultsMessage = document.getElementById('no-results-message');
        if (visibleCount === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
        }
    }

    function renderRecipes() {
        // This function now only renders based on category and veg filters.
        // The search filter is applied separately and doesn't cause a re-render.
        let filteredRecipes = recipes.filter(r => mealTypeMap[activeCategory]?.includes(r.meal_type));
        
        if (vegFilter === 'veg') {
            filteredRecipes = filteredRecipes.filter(r => r.is_vegetarian);
        } else if (vegFilter === 'nonveg') {
            filteredRecipes = filteredRecipes.filter(r => !r.is_vegetarian);
        }

        hubContent.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div class="flex items-center gap-4 flex-wrap">
                    <button id="add-recipe-btn" class="clay-btn px-4 py-2">Add Recipe</button>
                    <input type="search" id="recipe-search-input" placeholder="🔍 Find a recipe..." class="clay-input px-3 py-2" value="${searchTerm}" autocomplete="off">
                </div>
                <div id="veg-filter-dropdown-container" class="flex items-center space-x-2">
                    <select id="veg-filter-dropdown" class="clay-input px-2 py-1 rounded border border-stone-300 text-sm">
                        <option value="both" ${vegFilter === 'both' ? 'selected' : ''}>All Diets</option>
                        <option value="veg" ${vegFilter === 'veg' ? 'selected' : ''}>Vegetarian</option>
                        <option value="nonveg" ${vegFilter === 'nonveg' ? 'selected' : ''}>Non-Vegetarian</option>
                    </select>
                </div>
            </div>
            <div id="recipe-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${filteredRecipes.map(recipe => {
                    const maxLen = 250;
                    let instr = recipe.instructions || '';
                    let ingr = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(i => `${i.quantity} ${i.serving_unit} ${i.name}`).join('; ') : '';
                    let instrTrunc = instr.length > maxLen ? instr.slice(0, maxLen) + '…' : instr;
                    let ingrTrunc = ingr.length > maxLen ? ingr.slice(0, maxLen) + '…' : ingr;
                    instrTrunc = instrTrunc.replace(/\n/g, '<br>');
                    ingrTrunc = ingrTrunc.replace(/\n/g, '<br>');
                    
                    // Added a wrapper div with a data attribute for the recipe name
                    return `
                        <div class="recipe-card-container border border-stone-200 rounded-xl shadow-sm" data-recipe-name="${recipe.name}">
                            <div class="recipe-card relative flex flex-col h-full bg-white">
                                <div class="absolute top-2 right-2">
                                <span title="${recipe.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${recipe.is_vegetarian ? '#22c55e' : '#ef4444'};border:2px solid #fff;box-shadow:0 0 2px #888;"></span>
                                </div>
                                <div class="flex-grow">
                                    <h5 class="font-bold text-sm card-title mb-1">${recipe.name}</h5>
                                    <div class="relative">
                                        <p class="text-xs text-stone-600 mt-1 card-instructions" style="max-height:6em;overflow:hidden;">${instrTrunc}</p>
                                        <div class="fade-out-overlay absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-white to-transparent pointer-events-none hidden"></div>
                                    </div>
                                    <div class="relative mt-1">
                                        <p class="text-xs text-stone-500 card-ingredients" style="max-height:5em;overflow:hidden;"><span class="font-semibold">Ingredients:</span> ${ingrTrunc}</p>
                                        <div class="fade-out-overlay absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-white to-transparent pointer-events-none hidden"></div>
                                    </div>
                                    <p class="text-xs text-stone-500 mt-1 card-nutrition" style="max-height:3.5em;overflow:hidden;">${recipe.energy ? `<span class="font-semibold">Energy:</span> ${recipe.energy} kcal, ` : ''}${recipe.protein ? `<span class="font-semibold">Protein:</span> ${recipe.protein} g, ` : ''}${recipe.carbs ? `<span class="font-semibold">Carbs:</span> ${recipe.carbs} g, ` : ''}${recipe.fat ? `<span class="font-semibold">Fat:</span> ${recipe.fat} g, ` : ''}${recipe.fiber ? `<span class="font-semibold">Fiber:</span> ${recipe.fiber} g` : ''}</p>
                                </div>
                                <div class="pt-4 flex justify-between space-x-2">
                                    <button class="text-xs px-2 py-1 clay-btn" style="background:linear-gradient(135deg, #f7dbc4ff 60%, #c7d2fe 100%);color: #be6818;" onclick="window.showAssignModal(${recipe.id})">Assign</button>
                                    <div class="flex space-x-2">
                                        <button class="text-xs px-2 py-1 clay-btn" onclick="editRecipe(${recipe.id})">Edit</button>
                                        <button class="text-xs px-2 py-1 clay-btn" style="background:linear-gradient(135deg, #fbcfe8 60%, #c7d2fe 100%);color: #be185d;" onclick="deleteRecipe(${recipe.id})">Delete</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div id="no-results-message" class="col-span-full text-center text-stone-500 py-8" style="display: none;">No recipes found matching your search.</div>
        `;
        
        // --- Event Listeners ---
        document.getElementById('add-recipe-btn').addEventListener('click', () => showRecipeModal());
        
        // --- CHANGE 2: Other filters now call renderRecipes, which is correct ---
        document.getElementById('veg-filter-dropdown').addEventListener('change', (e) => {
            vegFilter = e.target.value;
            renderRecipes();
        });
        
        // --- CHANGE 3: Search input now calls the new lightweight filter function ---
        document.getElementById('recipe-search-input').addEventListener('input', (e) => {
            searchTerm = e.target.value;
            applySearchFilter(); // Does not re-render!
        });

        // After rendering, apply the current search term filter
        applySearchFilter();

        document.querySelectorAll('.card-instructions, .card-ingredients').forEach(p => {
            if (p.scrollHeight > p.clientHeight) {
                p.nextElementSibling?.classList.remove('hidden');
            }
        });
    }

    async function fetchRecipes() {
        try {
            const response = await fetch(`${API_BASE}/recipes`);
            recipes = await response.json();
            renderRecipes(); // Initial render
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    }
    
    // --- CHANGE 4: The tab click now also calls renderRecipes ---
    hubTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('hub-tab')) {
            hubTabsContainer.querySelectorAll('.hub-tab').forEach(tab => tab.classList.remove('active-tab', 'text-orange-900'));
            e.target.classList.add('active-tab', 'text-orange-900');
            activeCategory = e.target.textContent;
            searchTerm = ''; // Reset search term when changing category
            renderRecipes();
        }
    });

    // --- NEW: Modal to assign a recipe to the weekly plan ---
    window.showAssignModal = (recipeId) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) {
            alert('Recipe not found!');
            return;
        }

        // Suggest a meal slot based on the recipe's type
        let suggestedSlot = recipe.meal_type;
        if (recipe.meal_type === 'lunch' || recipe.meal_type === 'dinner') {
             // For simplicity, default lunch/dinner types to lunch
            suggestedSlot = 'lunch';
        }

        const modalHTML = `
            <div id="assign-recipe-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
                    <h2 class="text-xl font-bold mb-1">Assign Recipe</h2>
                    <p class="text-sm text-stone-600 mb-4">Assign "<strong>${recipe.name}</strong>" to a meal slot.</p>
                    <form id="assign-recipe-form">
                        <div class="mb-4">
                            <label for="assign-day" class="block text-sm font-medium text-stone-700 mb-1">Day of the Week</label>
                            <select id="assign-day" class="w-full clay-input p-2">
                                ${daysOfWeek.map(day => `<option value="${day}">${day}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-6">
                            <label for="assign-meal" class="block text-sm font-medium text-stone-700 mb-1">Meal Slot</label>
                            <select id="assign-meal" class="w-full clay-input p-2">
                                ${mealSlots.map(slot => `<option value="${slot}" ${slot === suggestedSlot ? 'selected' : ''}>${slot.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex justify-end space-x-2">
                            <button type="button" id="cancel-assign-btn" class="bg-stone-200 text-stone-800 px-4 py-2 rounded-lg hover:bg-stone-300">Cancel</button>
                            <button type="submit" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Save to Plan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const form = document.getElementById('assign-recipe-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const day = document.getElementById('assign-day').value;
            const meal = document.getElementById('assign-meal').value;
            
            let existingIds = weeklyPlan[day]?.[meal] || [];
            if (!Array.isArray(existingIds)) {
                existingIds = [existingIds];
            }

            if (existingIds.includes(recipeId)) {
                alert('This recipe is already assigned to that meal slot.');
                return;
            }

            const newRecipeIds = [...existingIds, recipeId];
            saveWeeklyPlanSlot(day, meal, newRecipeIds);
            document.getElementById('assign-recipe-modal').remove();
        });

        document.getElementById('cancel-assign-btn').addEventListener('click', () => {
            document.getElementById('assign-recipe-modal').remove();
        });
    };

    // The rest of your functions (editRecipe, deleteRecipe, showRecipeModal, etc.) remain unchanged.
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
    const showRecipeModal = async (recipe = null) => {
        let ingredientList = [];
        try {
            const resp = await fetch(`${API_BASE}/ingredients?sort=name`);
            ingredientList = await resp.json();
        } catch (e) {
            ingredientList = [];
        }
        ingredientList = ingredientList.sort((a, b) => a.name.localeCompare(b.name));
        let selectedIngredients = (recipe && Array.isArray(recipe.ingredients)) ? recipe.ingredients : [];
        const modalHTML = `
            <div id="recipe-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h2 class="text-2xl font-bold mb-4">${recipe ? 'Edit' : 'Add'} Recipe</h2>
                    <form id="recipe-form">
                        <input type="hidden" id="recipe-id" value="${recipe ? recipe.id : ''}">
                        <div class="mb-4">
                            <label for="recipe-name" class="block text-sm font-medium text-stone-700">Name</label>
                            <input type="text" id="recipe-name" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${recipe ? recipe.name : ''}" required>
                        </div>
                        <div class="mb-4">
                            <label for="recipe-serves" class="block text-sm font-medium text-stone-700">Serves</label>
                            <input type="number" id="recipe-serves" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${recipe ? recipe.serves : '2'}" step="1" required>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-stone-700 mb-1">Ingredients</label>
                            <div class="mb-2">
                                <input type="text" id="ingredient-search" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-1 text-sm" placeholder="Search ingredients...">
                            </div>
                            <div id="ingredient-select-list" class="space-y-2 max-h-72 overflow-y-auto border rounded p-2 bg-stone-50">
                                ${ingredientList.map(ing => {
                                    const sel = selectedIngredients.find(si => si.name === ing.name);
                                    return `
                                    <div class="ingredient-item flex items-center space-x-2">
                                        <input type="checkbox" class="ingredient-checkbox" data-id="${ing.id}" ${sel ? 'checked' : ''}>
                                        <span>${ing.name}</span>
                                        <input type="number" min="0" step="any" class="ingredient-qty w-16 px-1 border rounded" placeholder="Qty" required="true" value="${sel ? sel.quantity : ''}" ${sel ? '' : 'disabled'}>
            
                                        <span class="ingredient-unit w-16 px-1 border rounded bg-gray-100 text-gray-600" style="padding:2px 6px;">${sel ? sel.serving_unit : ing.serving_unit}</span>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div class="mb-4">
                            <label for="recipe-instructions" class="block text-sm font-medium text-stone-700">Instructions</label>
                            <textarea id="recipe-instructions" rows="4" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-1" required>${recipe ? recipe.instructions : ''}</textarea>
                        </div>
                        <div class="mb-4">
                            <label for="recipe-meal-type" class="block text-sm font-medium text-stone-700">Meal Type</label>
                            <select id="recipe-meal-type" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" required>
                                <option value="pre_breakfast" ${(recipe && recipe.meal_type === 'pre_breakfast') ? 'selected' : ''}>Pre-Breakfast</option>
                                <option value="breakfast" ${(recipe && recipe.meal_type === 'breakfast') ? 'selected' : ''}>Breakfast</option>
                                <option value="lunch" ${(recipe && recipe.meal_type === 'lunch') ? 'selected' : ''}>Lunch</option>
                                <option value="dinner" ${(recipe && recipe.meal_type === 'dinner') ? 'selected' : ''}>Dinner</option>
                                <option value="snack" ${(recipe && recipe.meal_type === 'snack') ? 'selected' : ''}>Snack</option>
                                <option value="weekend_prep" ${(recipe && recipe.meal_type === 'weekend_prep') ? 'selected' : ''}>Weekend Prep</option>
                                <option value="sides" ${(recipe && recipe.meal_type === 'sides') ? 'selected' : ''}>Sides</option>
                            </select>
                        </div>
                        <div class="mb-4 flex items-center">
                            <label for="recipe-veg" class="block text-sm font-medium text-stone-700 mr-2">Vegetarian?</label>
                            <input type="checkbox" id="recipe-veg" ${recipe && recipe.is_vegetarian === false ? '' : 'checked'}>
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
        overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());

        const searchInput = document.getElementById('ingredient-search');
        const ingredientItems = overlay.querySelectorAll('.ingredient-item');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            ingredientItems.forEach(item => {
                const ingredientName = item.querySelector('span').textContent.toLowerCase();
                if (ingredientName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        overlay.querySelectorAll('.ingredient-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const parent = cb.parentElement;
                parent.querySelector('.ingredient-qty').disabled = !cb.checked;
                parent.querySelector('.ingredient-unit').disabled = !cb.checked;
            });
        });
        document.getElementById('recipe-form').addEventListener('submit', saveRecipe);
        document.getElementById('cancel-btn').addEventListener('click', () => document.getElementById('recipe-modal').remove());
    };
    const saveRecipe = async (e) => {
        e.preventDefault();
        const id = document.getElementById('recipe-id').value;
        const name = document.getElementById('recipe-name').value;
        const serves = document.getElementById('recipe-serves').value;
        const instructions = document.getElementById('recipe-instructions').value;
        const meal_type = document.getElementById('recipe-meal-type').value;
        const is_vegetarian = document.getElementById('recipe-veg').checked;
        const ingredients = [];
        const ingredientElements = document.querySelectorAll('.ingredient-checkbox:checked');
        ingredientElements.forEach(cb => {
            const parent = cb.parentElement;
            const ingredientName = parent.querySelector('span').textContent;
            const qty = parent.querySelector('.ingredient-qty').value;
            const serving_unit = parent.querySelector('.ingredient-unit').textContent;
            ingredients.push({ name: ingredientName, quantity: parseFloat(qty) || 0, serving_unit: serving_unit });
        });
        const recipeData = { name, serves, ingredients, instructions, meal_type, is_vegetarian };
        try {
            if (id) {
                const response = await fetch(`${API_BASE}/recipes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recipeData)
                });
                const updatedRecipe = await response.json();
                const index = recipes.findIndex(r => r.id == id);
                if (index !== -1) recipes[index] = updatedRecipe;
            } else {
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
        } catch (error) {
            console.error('Error saving recipe:', error);
        }
    };
    fetchRecipes();
});