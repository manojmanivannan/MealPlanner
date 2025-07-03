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
                    <div class="bg-pastel-lavender p-3 clay shadow clay-shadow-outer meal-card-enter border border-transparent">
                        <h5 class="font-bold text-sm text-teal-800">${recipe.name}</h5>
                        <p class="text-xs text-stone-600 mt-1">${recipe.instructions}</p>
                        <p class="text-xs text-stone-500 mt-1"><span class="font-semibold">Ingredients:</span> ${recipe.ingredients}</p>
                        <div class="mt-2 flex justify-end space-x-2">
                            <button class="text-xs px-2 py-1 clay-btn" onclick="editRecipe(${recipe.id})">Edit</button>
                            <button class="text-xs px-2 py-1 clay-btn" style="background:linear-gradient(135deg,#fbcfe8 60%,#c7d2fe 100%);color:#be185d;" onclick="deleteRecipe(${recipe.id})">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4">
                <button id="add-recipe-btn" class="clay-btn px-4 py-2">Add New Recipe</button>
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
            renderShoppingList(); // Refresh ingredient list after save
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
    let shelfLifeMode = false;

    const renderShoppingList = async () => {
        const container = document.getElementById('ingredient-list-container');
        // Add input/buttons at the top
        container.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
                <input id="new-ingredient-input" type="text" placeholder="Ingredient..." class="clay-input border border-transparent w-full sm:w-auto">
                <input id="new-ingredient-shelf-life" type="number" min="0" placeholder="Shelf life (days)" class="clay-input border border-transparent w-full sm:w-auto">
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
                // Sort by shelf_life ascending
                const sorted = [...ingredients].sort((a, b) => (a.shelf_life ?? 9999) - (b.shelf_life ?? 9999));
                // Render as 2 columns
                html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                sorted.forEach(ing => {
                    const expired = ing.shelf_life <= 0;
                    html += `
                        <label class="flex items-center space-x-2 p-2 bg-pastel-mint clay shadow clay-shadow-outer border border-transparent relative">
                            <input type="checkbox" data-id="${ing.id}" ${ing.available ? 'checked' : ''} class="clay-checkbox">
                            <span class="text-xs ingredient-name${expired ? ' line-through text-red-500' : ''}">${ing.name}</span>
                            <span class="ml-auto text-xs ${expired ? 'text-red-500 font-bold' : 'text-stone-500'}">
                                ${expired ? 'Expired' : (ing.shelf_life === 1 ? '1 day left' : ing.shelf_life + ' days left')}
                            </span>
                            <button type="button" data-id="${ing.id}" class="edit-shelf-life-btn clay-btn absolute right-10 top-1 text-xs font-bold" title="Edit shelf life">✎</button>
                            <button type="button" data-id="${ing.id}" class="delete-ingredient-btn clay-btn absolute right-1 top-1 text-xs font-bold" style="background:linear-gradient(135deg,#fbcfe8 60%,#c7d2fe 100%);color:#be185d;" title="Delete">&times;</button>
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
                                <label class="flex items-center space-x-1 p-2 bg-pastel-blue clay shadow clay-shadow-outer group border border-transparent relative">
                                    <input type="checkbox" data-id="${ing.id}" ${ing.available ? 'checked' : ''} class="clay-checkbox">
                                    <span class="text-xs">${ing.name}</span>
                                    <button type="button" data-id="${ing.id}" class="edit-shelf-life-btn clay-btn absolute right-10 top-1 text-xs font-bold" title="Edit shelf life">✎</button>
                                    <button type="button" data-id="${ing.id}" class="delete-ingredient-btn clay-btn absolute right-1 top-1 text-xs font-bold" style="background:linear-gradient(135deg,#fbcfe8 60%,#c7d2fe 100%);color:#be185d;" title="Delete">&times;</button>
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
            // Edit shelf life logic
            listSection.querySelectorAll('.edit-shelf-life-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const ing = ingredients.find(i => i.id == id);
                    let newShelfLife = prompt(`Enter new shelf life (days) for '${ing.name}':`, ing.shelf_life);
                    if (newShelfLife === null) return; // Cancelled
                    newShelfLife = newShelfLife.trim();
                    if (newShelfLife === '' || isNaN(newShelfLife) || parseInt(newShelfLife, 10) <= 0) {
                        alert('Shelf life must be an integer greater than 0 (days).');
                        return;
                    }
                    btn.disabled = true;
                    try {
                        await fetch(`${API_BASE}/ingredients/${id}?shelf_life=${encodeURIComponent(newShelfLife)}`, {
                            method: 'PUT'
                        });
                        renderShoppingList();
                    } catch (error) {
                        alert('Failed to update shelf life.');
                    } finally {
                        btn.disabled = false;
                    }
                });
            });
            // Delete ingredient logic
            listSection.querySelectorAll('.delete-ingredient-btn').forEach(btn => {
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