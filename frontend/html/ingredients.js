document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';
    let shelfLifeMode = false;
    // NEW: Helper function to fetch units and populate a <select> element
    const populateUnitSelect = async (selectId, selectedValue = null) => {
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;

        try {
            const response = await fetch(`${API_BASE}/list-serving-units`);
            if (!response.ok) throw new Error('Failed to fetch units');
            
            const units = await response.json();
            
            selectElement.innerHTML = ''; // Clear existing options
            units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = unit;
                if (unit === selectedValue) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating serving units:", error);
            // Add a default fallback option
            selectElement.innerHTML = '<option value="">Error loading units</option>';
        }
    };
    const renderShoppingList = async () => {
        const container = document.getElementById('ingredient-list-container');
        container.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 mb-4">
                <input id="new-ingredient-input" type="text" placeholder="Ingredient..." class="clay-input border border-transparent w-full sm:w-auto">
                <input id="new-ingredient-shelf-life" type="number" min="0" placeholder="Shelf life (days)" class="clay-input border border-transparent w-full sm:w-auto">
                <select id="new-ingredient-unit" class="clay-input border border-transparent w-full sm:w-auto" ></select>
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
        populateUnitSelect('new-ingredient-unit');
        const listSection = document.getElementById('ingredients-list-section');
        try {
            const response = await fetch(`${API_BASE}/ingredients-list`);
            let ingredients = await response.json();
            let html = '';
            if (shelfLifeMode) {
                const sorted = [...ingredients].sort((a, b) => {
                    if (a.available === b.available) {
                        return (a.remaining_shelf_life ?? 9999) - (b.remaining_shelf_life ?? 9999);
                    }
                    return (b.available ? 1 : 0) - (a.available ? 1 : 0);
                });
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
            listSection.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const available = e.target.checked;
                    await fetch(`${API_BASE}/ingredients/${id}?available=${available}`, {
                        method: 'PUT'
                    });
                    renderShoppingList();
                });
            });
            listSection.querySelectorAll('.edit-ingredient-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const ing = ingredients.find(i => i.id == id);
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
                                        <select id="edit-ingredient-unit" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" required></select>
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-kcal-label" class="block text-sm font-medium text-stone-700">Energy (kcal)</label>
                                        <input type="number" id="edit-ingredient-kcal" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"></select>
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-protein-label" class="block text-sm font-medium text-stone-700">Protein (g)</label>
                                        <input type="number" id="edit-ingredient-protein" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"></select>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-stone-700">Fat (g)</label>
                                        <input type="number" id="edit-ingredient-fat" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"></select>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-stone-700">Carbs (g)</label>
                                        <input type="number" id="edit-ingredient-carbs" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"></select>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-stone-700">Fiber (g)</label>
                                        <input type="number" id="edit-ingredient-fiber" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"></select>
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
                    // --- DYNAMIC LABEL LOGIC ---
                    // Step 2: Create a function to update the labels based on the selected unit.
                    const updateNutritionLabels = (unit) => {
                        const kcalLabel = document.getElementById('edit-kcal-label');
                        const proteinLabel = document.getElementById('edit-protein-label');
                        // Add other nutrition labels here if needed

                        let perUnitText = '';
                        switch (unit) {
                            case 'g':
                                perUnitText = '100g';
                                break;
                            case 'kg':
                                perUnitText = 'kg';
                                break;
                            case 'ml':
                                perUnitText = '100ml';
                                break;
                            case 'l':
                                perUnitText = 'l';
                                break;
                            default:
                                perUnitText = `${unit}`; // For 'cup', 'tsp', 'unit', etc.
                        }
                        
                        kcalLabel.textContent = `Energy (kcal/${perUnitText})`;
                        proteinLabel.textContent = `Protein (g/${perUnitText})`;
                        // ... update other labels ...
                    };
                    populateUnitSelect('edit-ingredient-unit', ing.serving_unit);
                    updateNutritionLabels(ing.serving_unit); 
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
                        if (!newUnit) {
                            alert('Unit must be a one of the valid units (g, kg, ml, l, cup, tbsp, tsp).');
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
            const addBtn = document.getElementById('add-ingredient-btn');
            const input = document.getElementById('new-ingredient-input');
            const shelfLifeInput = document.getElementById('new-ingredient-shelf-life');
            addBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = input.value.trim();
                const shelf_life = shelfLifeInput.value.trim();
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
    renderShoppingList();
});
