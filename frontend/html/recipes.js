document.addEventListener('DOMContentLoaded', () => {
    const hubContent = document.getElementById('hub-content');
    const hubTabsContainer = document.getElementById('hub-tabs');
    let recipes = [];
    let activeCategory = '🍳 Breakfast';
    let vegFilter = 'both'; // 'both', 'veg', 'nonveg'

    const API_BASE = '/api';

    const mealTypeMap = {
        '☕ Pre-Breakfast': ['pre-breakfast'],
        '🍳 Breakfast': ['breakfast'],
        '🍲 Lunch & Dinner': ['lunch', 'dinner'],
        '🥜 Snacks': ['snack'],
        '🗓️ Weekend Prep': ['weekend prep'],
        '🥗 Sides': ['sides']
    };

    const dayBgClass = [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];

    const renderRecipes = () => {
        // Add filter dropdown at the top right of the hub frame, but hide it when a modal is open
        const filterDropdown = `
            <div id="veg-filter-dropdown-container" class="flex items-center space-x-2 absolute right-4 top-0 z-10">
                <select id="veg-filter-dropdown" class="clay-input px-2 py-1 rounded border border-stone-300 text-sm">
                    <option value="both" ${vegFilter === 'both' ? 'selected' : ''}>Both</option>
                    <option value="veg" ${vegFilter === 'veg' ? 'selected' : ''}>Vegetarian</option>
                    <option value="nonveg" ${vegFilter === 'nonveg' ? 'selected' : ''}>Non-Vegetarian</option>
                </select>
            </div>
        `;
        // Filter recipes by meal type and vegFilter
        let filteredRecipes = recipes.filter(r => mealTypeMap[activeCategory]?.includes(r.meal_type));
        if (vegFilter === 'veg') filteredRecipes = filteredRecipes.filter(r => r.is_vegetarian);
        if (vegFilter === 'nonveg') filteredRecipes = filteredRecipes.filter(r => r.is_vegetarian === false);
        hubContent.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 relative">
                <button id="add-recipe-btn" class="clay-btn px-4 py-2 mb-2 sm:mb-0">Add Recipe</button>
                ${filterDropdown}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                ${filteredRecipes.map(recipe => {
                    // Truncate instructions and ingredients, preserve line breaks
                    const maxLen = 250;
                    let instr = recipe.instructions || '';
                    let ingr = recipe.ingredients || '';
                    let instrTrunc = instr.length > maxLen ? instr.slice(0, maxLen) + '…' : instr;
                    let ingrTrunc = ingr.length > maxLen ? ingr.slice(0, maxLen) + '…' : ingr;
                    // Replace line breaks with <br>
                    instrTrunc = instrTrunc.replace(/\n/g, '<br>');
                    ingrTrunc = ingrTrunc.replace(/\n/g, '<br>');
                    return `
                        <div class="recipe-card relative flex flex-col h-full">
                            <div class="absolute top-2 right-2">
                                <span title="${recipe.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${recipe.is_vegetarian ? '#22c55e' : '#ef4444'};border:2px solid #fff;box-shadow:0 0 2px #888;"></span>
                            </div>
                            <div>
                                <h5 class="font-bold text-sm card-title mb-1">${recipe.name}</h5>
                                <p class="text-xs text-stone-600 mt-1 card-instructions" style="max-height:4.5em;overflow:hidden;">${instrTrunc}</p>
                                <p class="text-xs text-stone-500 mt-1 card-ingredients" style="max-height:3.5em;overflow:hidden;"><span class="font-semibold">Ingredients:</span> ${ingrTrunc}</p>
                            </div>
                            <div class="absolute bottom-3 right-3 flex space-x-2">
                                <button class="text-xs px-2 py-1 clay-btn" onclick="editRecipe(${recipe.id})">Edit</button>
                                <button class="text-xs px-2 py-1 clay-btn" style="background:linear-gradient(135deg,#fbcfe8 60%,#c7d2fe 100%);color:#be185d;" onclick="deleteRecipe(${recipe.id})">Delete</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('add-recipe-btn').addEventListener('click', () => {
            showRecipeModal();
            // Hide veg filter dropdown when modal is open
            const dropdownContainer = document.getElementById('veg-filter-dropdown-container');
            if (dropdownContainer) dropdownContainer.style.display = 'none';
            // Restore on modal close
            const observer = new MutationObserver(() => {
                if (!document.getElementById('recipe-modal')) {
                    dropdownContainer.style.display = '';
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true });
        });
        document.getElementById('veg-filter-dropdown').addEventListener('change', (e) => {
            vegFilter = e.target.value;
            renderRecipes();
        });
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

    const showRecipeModal = async (recipe = null) => {
        
        // Fetch ingredients list from backend
        let ingredientList = [];
        try {
            const resp = await fetch(`${API_BASE}/ingredients?sort=name`);
            ingredientList = await resp.json();
        } catch (e) {
            ingredientList = [];
        }
        // Sort ingredientList alphabetically by name
        ingredientList = ingredientList.sort((a, b) => a.name.localeCompare(b.name));
        // Parse recipe ingredients if editing
        let selectedIngredients = [];
        if (recipe && Array.isArray(recipe.ingredients)) {
            selectedIngredients = recipe.ingredients;
        }
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
                            <label class="block text-sm font-medium text-stone-700 mb-1">Ingredients</label>
                            <div id="ingredient-select-list" class="space-y-2 max-h-72 overflow-y-auto border rounded p-2 bg-stone-50">
                                ${ingredientList.map(ing => {
                                    // Find if selected
                                    const sel = selectedIngredients.find(si => si.id === ing.id);
                                    return `
                                    <div class="flex items-center space-x-2">
                                        <input type="checkbox" class="ingredient-checkbox" data-id="${ing.id}" ${sel ? 'checked' : ''}>
                                        <span>${ing.name}</span>
                                        <input type="number" min="0" step="any" class="ingredient-qty w-16 px-1 border rounded" placeholder="Qty" value="${sel ? sel.quantity : ''}" ${sel ? '' : 'disabled'}>
                                        <span class="ingredient-unit w-16 px-1 border rounded bg-gray-100 text-gray-600" style="padding:2px 6px;">${ing.serving_unit}</span>
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
                                <option value="pre-breakfast" ${(recipe && recipe.meal_type === 'pre-breakfast') || (!recipe && defaultMealType === 'pre-breakfast') ? 'selected' : ''}>Pre-Breakfast</option>
                                <option value="breakfast" ${(recipe && recipe.meal_type === 'breakfast') || (!recipe && defaultMealType === 'breakfast') ? 'selected' : ''}>Breakfast</option>
                                <option value="lunch" ${(recipe && recipe.meal_type === 'lunch') || (!recipe && defaultMealType === 'lunch') ? 'selected' : ''}>Lunch</option>
                                <option value="dinner" ${(recipe && recipe.meal_type === 'dinner') || (!recipe && defaultMealType === 'dinner') ? 'selected' : ''}>Dinner</option>
                                <option value="snack" ${(recipe && recipe.meal_type === 'snack') || (!recipe && defaultMealType === 'snack') ? 'selected' : ''}>Snack</option>
                                <option value="weekend prep" ${(recipe && recipe.meal_type === 'weekend prep') || (!recipe && defaultMealType === 'weekend prep') ? 'selected' : ''}>Weekend Prep</option>
                                <option value="sides" ${(recipe && recipe.meal_type === 'sides') || (!recipe && defaultMealType === 'sides') ? 'selected' : ''}>Sides</option>
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
        overlay.addEventListener('click', () => overlay.remove());
        overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());
        // Enable/disable qty/unit fields based on checkbox
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
        const instructions = document.getElementById('recipe-instructions').value;
        const meal_type = document.getElementById('recipe-meal-type').value;
        const is_vegetarian = document.getElementById('recipe-veg').checked;

        // Gather ingredients data
        const ingredients = [];
        const ingredientElements = document.querySelectorAll('.ingredient-checkbox:checked');
        ingredientElements.forEach(cb => {
            const parent = cb.parentElement;
            const qty = parent.querySelector('.ingredient-qty').value;
            const unit = parent.querySelector('.ingredient-unit').value;
            ingredients.push({ id: cb.getAttribute('data-id'), quantity: qty, unit });
        });

        const recipeData = { name, ingredients, instructions, meal_type, is_vegetarian };
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
            renderShoppingList(); // Refresh ingredient list after save
        } catch (error) {
            console.error('Error saving recipe:', error);
        }
    };

    // --- Weekly Planner Logic ---
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealSlots = ["pre-breakfast", "breakfast", "lunch", "snack", "dinner"];
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
        plannerGrid.innerHTML = daysOfWeek.map((day, idx) => `
            <div class="meal-card ${dayBgClass[idx]} flex flex-col">
                <h4 class="text-lg font-bold card-title mb-1 text-center">${day}</h4>
                ${mealSlots.map(meal => {
                    let recipeIds = weeklyPlan[day]?.[meal] || [];
                    if (!Array.isArray(recipeIds)) recipeIds = recipeIds ? [recipeIds] : [];
                    // Render each recipe name as a separate clickable span (not as a comma-separated string)
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
        // Attach click listeners to all recipe links (use event delegation for robustness)
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
        // Show modal to pick multiple recipes for this meal type, unless the meal type is 'pre-breakfast' or 'sides'
        // const filtered = recipes.filter(r => r.meal_type === meal); // Filter out pre-breakfast and sides
        let filtered = [];

        // Check if the current meal is 'pre-breakfast' or 'sides'
        if (meal === 'pre-breakfast') {
            // If it is pre-breakfast, show only 'pre-breakfast'
            filtered = recipes.filter(r => r.meal_type === 'pre-breakfast');
        } else if (meal === 'snack') {
            // If it is snack, show only 'snack'
            filtered = recipes.filter(r => r.meal_type === 'snack');
        } else {
            // Otherwise, show all recipes except 'pre-breakfast' and 'snack'
            filtered = recipes.filter(r => !['pre-breakfast', 'snack'].includes(r.meal_type));
            // filtered = recipes; //.filter(r => r.meal_type === meal);
        }
        // const filtered = recipes.filter(r => r.meal_type === meal); // Optionally filter by meal type
        // Get current selection
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
        // Save array of recipe IDs for the slot
        saveWeeklyPlanSlot(day, meal, recipeIds);
    };

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

    const showRecipeDetails = (id) => {
        if (!id) return;
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;
        // Render line breaks for instructions and ingredients
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

    // Make showRecipeModal globally available for inline event handlers
    window.showRecipeModal = showRecipeModal;
    // Make showRecipeDetails globally available for planner click events
    window.showRecipeDetails = showRecipeDetails;

    // --- End Weekly Planner Logic ---

    // --- Shopping List Logic ---
    let shelfLifeMode = false;

    const renderShoppingList = async () => {
        const container = document.getElementById('ingredient-list-container');
        // Add input/buttons at the top
        container.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
                <input id="new-ingredient-input" type="text" placeholder="Ingredient..." class="clay-input border border-transparent w-full sm:w-auto">
                <input id="new-ingredient-shelf-life" type="number" min="0" placeholder="Shelf life (days)" class="clay-input border border-transparent w-full sm:w-auto">
                <select id="new-ingredient-unit" class="clay-input border border-transparent w-full sm:w-auto" >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                </select>
                <button id="add-ingredient-btn" class="clay-btn text-sm w-full sm:w-auto px-6 py-2">Add</button>
                <div class="flex-1"></div>
                <label class="flex items-center cursor-pointer ml-auto">
                    <span class="mr-2 text-sm clay-label">Sort by shelf life</span>
                    <span class="relative inline-flex items-center w-12 h-6">
                        <input type="checkbox" id="toggle-shelf-life" class="sr-only peer">
                        <span class="w-12 h-6 bg-pastel-blue clay-section rounded-full peer peer-checked:bg-pastel-mint transition-colors duration-200"></span>
                        <span class="absolute left-0 top-0 h-6 w-6 bg-white border border-transparent rounded-full shadow transform transition-transform duration-200 peer-checked:translate-x-6"></span>
                    </span>
                </label>
            </div>
            <div id="ingredients-list-section"></div>
        `;
        const listSection = document.getElementById('ingredients-list-section');
        try {
            const response = await fetch(`${API_BASE}/ingredients-list`);
            let ingredients = await response.json();
            // Render by mode
            let html = '';
            if (shelfLifeMode) {
                // Sort by available (true first), then by shelf_life ascending
                const sorted = [...ingredients].sort((a, b) => {
                    if (a.available === b.available) {
                        return (a.remaining_shelf_life ?? 9999) - (b.remaining_shelf_life ?? 9999);
                    }
                    return (b.available ? 1 : 0) - (a.available ? 1 : 0);
                });
                // Render as 2 columns
                html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                sorted.forEach(ing => {
                    const expired = ing.remaining_shelf_life <= 0;
                    html += `
                        <label class="ingredient-card flex items-center justify-between space-x-2 p-2 border border-transparent relative">
                            <div class="flex items-center space-x-2 flex-1 min-w-0">
                                <input type="checkbox" data-id="${ing.id}" ${ing.available ? 'checked' : ''} class="clay-checkbox">
                                <span class="text-xs ingredient-name${expired ? ' line-through text-red-500' : ''} truncate">${ing.name}</span>
                                <span class="ml-2 text-xs ${expired ? 'text-red-500 font-bold' : 'text-stone-500'}">
                                    ${expired ? 'Expired' : (ing.remaining_shelf_life === 1 ? '1 day left' : ing.remaining_shelf_life + ' days left')}
                                </span>
                            </div>
                            <div class="flex items-center space-x-2 ml-2">
                                <button type="button" data-id="${ing.id}" class="edit-ingredient-btn clay-btn px-2 py-1 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 hover:bg-blue-50" title="Edit shelf life">✎</button>
                                <button type="button" data-id="${ing.id}" class="delete-ingredient-btn clay-btn px-2 py-1 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-pink-300 hover:bg-pink-50" style="background:linear-gradient(135deg,#fbcfe8 60%,#c7d2fe 100%);color:#be185d;" title="Delete">&times;</button>
                            </div>
                        </label>
                    `;
                });
                html += `</div>`;
            } else {
                // Alphabetical grouping
                const grouped = {};
                ingredients.forEach(ing => {
                    const letter = ing.name.charAt(0).toUpperCase();
                    if (!grouped[letter]) grouped[letter] = [];
                    grouped[letter].push(ing);
                });
                const letters = Object.keys(grouped).sort();
                html += letters.map(letter => `
                    <div class="mb-2">
                        <div class="font-bold clay-label text-xs mb-1 pl-1">${letter}</div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                            ${grouped[letter].map(ing => `
                                <label class="ingredient-card flex items-center justify-between space-x-2 p-2 group border border-transparent relative">
                                    <div class="flex items-center space-x-2 flex-1 min-w-0">
                                        <input type="checkbox" data-id="${ing.id}" ${ing.available ? 'checked' : ''} class="clay-checkbox">
                                        <span class="text-xs truncate">${ing.name}</span>
                                    </div>
                                    <div class="flex items-center space-x-2 ml-2">
                                        <button type="button" data-id="${ing.id}" class="edit-ingredient-btn clay-btn px-2 py-1 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 hover:bg-blue-50" title="Edit ingredient">✎</button>
                                        <button type="button" data-id="${ing.id}" class="delete-ingredient-btn clay-btn px-2 py-1 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-pink-300 hover:bg-pink-50" style="background:linear-gradient(135deg,#fbcfe8 60%,#c7d2fe 100%);color:#be185d;" title="Delete">&times;</button>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            }
            listSection.innerHTML = html;
            // Checkbox logic
            listSection.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const available = e.target.checked;
                    await fetch(`${API_BASE}/ingredients/${id}?available=${available}`, {
                        method: 'PUT'
                    });
                    renderShoppingList(); // Refresh to get updated shelf life from backend
                });
            });
            // Edit shelf life and name logic
            listSection.querySelectorAll('.edit-ingredient-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const ing = ingredients.find(i => i.id == id);
                    // Modal for editing name and shelf life
                    const modalId = 'edit-ingredient-modal';
                    if (document.getElementById(modalId)) document.getElementById(modalId).remove();
                    const modalHTML = `
                        <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-xs relative" onclick="event.stopPropagation()">
                                <button class="absolute top-2 right-2 text-2xl text-stone-400 hover:text-stone-700" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                                <h2 class="text-xl font-bold mb-4">Edit Ingredient</h2>
                                <form id="edit-ingredient-form">
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-stone-700">Name</label>
                                        <input type="text" id="edit-ingredient-name" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.name}" required>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-stone-700">Shelf Life (days)</label>
                                        <input type="number" id="edit-ingredient-shelf-life" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.shelf_life}" min="1" required>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-stone-700">Serving Unit</label>
                                        <input type="text" id="edit-ingredient-unit" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.serving_unit}" min="1" required>
                                    </div>
                                    <div class="flex justify-end space-x-4">
                                        <button type="button" id="cancel-edit-ingredient" class="bg-stone-200 text-stone-800 px-4 py-2 rounded-lg hover:bg-stone-300">Cancel</button>
                                        <button type="submit" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Save</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    `;
                    document.body.insertAdjacentHTML('beforeend', modalHTML);
                    const overlay = document.getElementById(modalId);
                    overlay.addEventListener('click', () => overlay.remove());
                    overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());
                    document.getElementById('cancel-edit-ingredient').addEventListener('click', () => overlay.remove());
                    document.getElementById('edit-ingredient-form').addEventListener('submit', async (ev) => {
                        ev.preventDefault();
                        const newName = document.getElementById('edit-ingredient-name').value.trim();
                        const newShelfLife = document.getElementById('edit-ingredient-shelf-life').value.trim();
                        const newUnit = document.getElementById('edit-ingredient-unit').value.trim();
                        if (!newName) {
                            alert('Name is required.');
                            return;
                        }
                        if (!newShelfLife || isNaN(newShelfLife) || parseInt(newShelfLife, 10) <= 0) {
                            alert('Shelf life must be an integer greater than 0 (days).');
                            return;
                        }
                        // validate unit, should a string like g, kg, ml, etc.
                        if (!newUnit) {
                            alert('Unit must be a one of the valid units (g, ml, cup, tbsp, tsp).');
                            return;
                        }
                        try {
                            const params = new URLSearchParams({
                                name: newName,
                                shelf_life: newShelfLife,
                                serving_unit: newUnit
                            });
                            const resp = await fetch(`${API_BASE}/ingredients/${id}?${params.toString()}`, {
                                method: 'PUT'
                            });
                            if (!resp.ok) {
                                const err = await resp.json();
                                alert(err.detail || 'Failed to update ingredient.');
                                return;
                            }
                            overlay.remove();
                            renderShoppingList();
                        } catch (error) {
                            alert('Failed to update ingredient.');
                        }
                    });
                });
            });
            // Delete ingredient logic
            listSection.querySelectorAll('.delete-ingredient-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const ing = ingredients.find(i => i.id == id);
                    const ingName = ing ? ing.name : 'this ingredient';
                    if (window.confirm(`Delete ingredient '${ingName}'?`)) {
                        await fetch(`${API_BASE}/ingredients/${id}`, { method: 'DELETE' });
                        renderShoppingList();
                    }
                });
            });
            // Add ingredient logic
            const addBtn = document.getElementById('add-ingredient-btn');
            const input = document.getElementById('new-ingredient-input');
            const shelfLifeInput = document.getElementById('new-ingredient-shelf-life');
            addBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = input.value.trim();
                const shelf_life = shelfLifeInput.value.trim();
                // Validation: shelf life is required and must be integer > 0
                if (!name) return;
                if (shelf_life === '') {
                    alert('Shelf life is required and must be an integer greater than 0 (days).');
                    shelfLifeInput.focus();
                    return;
                }
                const shelfLifeInt = parseInt(shelf_life, 10);
                if (isNaN(shelfLifeInt) || shelfLifeInt <= 0) {
                    alert('Shelf life must be an integer greater than 0 (days).');
                    shelfLifeInput.focus();
                    return;
                }
                addBtn.disabled = true;
                try {
                    let url = `${API_BASE}/ingredients?name=${encodeURIComponent(name)}&shelf_life=${encodeURIComponent(shelf_life)}`;
                    const resp = await fetch(url, {
                        method: 'POST'
                    });
                    if (resp.ok) {
                        input.value = '';
                        shelfLifeInput.value = '';
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
            // Toggle logic (checkbox switch)
            const toggle = document.getElementById('toggle-shelf-life');
            if (toggle) {
                toggle.checked = shelfLifeMode;
                toggle.addEventListener('change', (e) => {
                    shelfLifeMode = toggle.checked;
                    renderShoppingList();
                });
            }
        } catch (error) {
            listSection.innerHTML = '<div class="text-red-600">Failed to load ingredient list.</div>';
        }
    }

    renderShoppingList(); // Initial render
    fetchRecipes(); // Initial fetch
});