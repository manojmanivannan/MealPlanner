document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';
    const hubContent = document.getElementById('hub-content');
    const hubTabsContainer = document.getElementById('hub-tabs');
    let recipes = [];
    let activeCategory = '🍳 Breakfast';
    let vegFilter = 'both';
    const mealTypeMap = {
        '☕ Pre-Breakfast': ['pre_breakfast'],
        '🍳 Breakfast': ['breakfast'],
        '🍲 Lunch & Dinner': ['lunch', 'dinner'],
        '🥜 Snacks': ['snack'],
        '🗓️ Weekend Prep': ['weekend_prep'],
        '🥗 Sides': ['sides']
    };
    function renderRecipes() {
        const filterDropdown = `
            <div id="veg-filter-dropdown-container" class="flex items-center space-x-2">
                <select id="veg-filter-dropdown" class="clay-input px-2 py-1 rounded border border-stone-300 text-sm">
                    <option value="both" ${vegFilter === 'both' ? 'selected' : ''}>Both</option>
                    <option value="veg" ${vegFilter === 'veg' ? 'selected' : ''}>Vegetarian</option>
                    <option value="nonveg" ${vegFilter === 'nonveg' ? 'selected' : ''}>Non-Vegetarian</option>
                </select>
            </div>
        `;
        let filteredRecipes = recipes.filter(r => mealTypeMap[activeCategory]?.includes(r.meal_type));
        if (vegFilter === 'veg') filteredRecipes = filteredRecipes.filter(r => r.is_vegetarian);
        if (vegFilter === 'nonveg') filteredRecipes = filteredRecipes.filter(r => r.is_vegetarian === false);
        hubContent.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <button id="add-recipe-btn" class="clay-btn px-4 py-2">Add Recipe</button>
                ${filterDropdown}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${filteredRecipes.map(recipe => {
                    const maxLen = 250;
                    let instr = recipe.instructions || '';
                    // let ingr = recipe.ingredients || '';
                    let ingr = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(i => `${i.quantity} ${i.serving_unit} ${i.name}`).join('; ') : '';
                    let instrTrunc = instr.length > maxLen ? instr.slice(0, maxLen) + '…' : instr;
                    let ingrTrunc = ingr.length > maxLen ? ingr.slice(0, maxLen) + '…' : ingr;
                    instrTrunc = instrTrunc.replace(/\n/g, '<br>');
                    ingrTrunc = ingrTrunc.replace(/\n/g, '<br>');
                    return `
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
                            <div class="pt-4 flex justify-end space-x-2">
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
            const dropdownContainer = document.getElementById('veg-filter-dropdown-container');
            if (dropdownContainer) dropdownContainer.style.display = 'none';
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

        // Conditionally apply fade-out gradient if text overflows
        document.querySelectorAll('.card-instructions, .card-ingredients').forEach(p => {
            const isOverflowing = p.scrollHeight > p.clientHeight;
            const overlay = p.nextElementSibling;
            if (isOverflowing && overlay && overlay.classList.contains('fade-out-overlay')) {
                overlay.classList.remove('hidden');
            }
        });
    }
    async function fetchRecipes() {
        try {
            const response = await fetch(`${API_BASE}/recipes`);
            recipes = await response.json();
            renderRecipes();
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    }
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
                                        <input type="number" min="0" step="any" class="ingredient-qty w-16 px-1 border rounded" placeholder="Qty" value="${sel ? sel.quantity : ''}" ${sel ? '' : 'disabled'}>
            
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
        // overlay.addEventListener('click', () => overlay.remove());
        overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());

        // ADDED: Logic for the ingredient search filter
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
        const recipeData = { name, ingredients, instructions, meal_type, is_vegetarian };
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