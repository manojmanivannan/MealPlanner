document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';
    let shelfLifeMode = false;
    // NEW: Helper function to fetch units and populate a <select> element
    const populateUnitSelect = async (selectId, selectedValue = null) => {
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;

        try {
            const response = await fetch(`${API_BASE}/utilities/list-serving-units`);
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
                <button id="toggle-all-details-btn" class="clay-btn text-xs px-3 py-1 mr-4">Collapse All</button>
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
            const response = await fetch(`${API_BASE}/ingredients`);
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
                    <details class="mb-2" open>
                        <summary class="font-bold clay-label text-xs mb-1 pl-1 cursor-pointer">${letter}</summary>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 pt-2">
                            ${grouped[letter].map(ing => `
                                <label class="ingredient-card flex items-center justify-between space-x-2 p-2 group border border-transparent relative transition-opacity duration-200 ${!ing.available ? 'opacity-80' : ''}">
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
                    </details>
                `).join('');
            }
            listSection.innerHTML = html;

            // --- MODIFIED EVENT LISTENER ---
            listSection.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const checkbox = e.target;
                    const id = checkbox.getAttribute('data-id');
                    const available = checkbox.checked;
                    const card = checkbox.closest('.ingredient-card');

                    checkbox.disabled = true; // Prevent multiple clicks while processing

                    try {
                        const response = await fetch(`${API_BASE}/ingredients/${id}?available=${available}`, {
                            method: 'PUT'
                        });

                        if (!response.ok) throw new Error('Server update failed');

                        if (shelfLifeMode) {
                            // In shelf-life mode, the list MUST be re-sorted.
                            // A full re-render is the simplest way to achieve this.
                            renderShoppingList();
                        } else {
                            // In the default view, avoid the "refresh" and just toggle a class.
                            if (card) {
                                card.classList.toggle('opacity-80', !available);
                            }
                            checkbox.disabled = false; // Re-enable the checkbox
                        }
                    } catch (error) {
                        console.error('Failed to update ingredient:', error);
                        // If the update fails, revert the checkbox and visual state
                        checkbox.checked = !available;
                        if (card) {
                            card.classList.toggle('opacity-80', !available);
                        }
                        alert('Update failed. Please try again.');
                        checkbox.disabled = false; // Re-enable on failure too
                    }
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
                    console.log(ing);
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
                                        <label class="block text-sm font-medium text-stone-700">Serving Size</label>
                                        <input type="number" id="edit-ingredient-serving-size" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.serving_size}" min="1" step="1" required>
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-kcal-label" class="block text-sm font-medium text-stone-700">Energy (kcal)</label>
                                        <input type="number" id="edit-ingredient-kcal" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.energy}" min="0" step="any">
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-protein-label" class="block text-sm font-medium text-stone-700">Protein (g)</label>
                                        <input type="number" id="edit-ingredient-protein" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.protein}" min="0" step="any">
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-fat-label" class="block text-sm font-medium text-stone-700">Fat (g)</label>
                                        <input type="number" id="edit-ingredient-fat" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.fat}" min="0" step="any">
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-carbs-label" class="block text-sm font-medium text-stone-700">Carbs (g)</label>
                                        <input type="number" id="edit-ingredient-carbs" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.carbs}" min="0" step="any">
                                    </div>
                                    <div class="mb-4">
                                        <label id="edit-fiber-label" class="block text-sm font-medium text-stone-700">Fiber (g)</label>
                                        <input type="number" id="edit-ingredient-fiber" class="mt-1 block w-full rounded-sm border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500" value="${ing.fiber}" min="0" step="any">
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
                    const updateNutritionLabels = (unit) => {
                        const kcalLabel = document.getElementById('edit-kcal-label');
                        const proteinLabel = document.getElementById('edit-protein-label');
                        const fatLabel = document.getElementById('edit-fat-label');
                        const carbsLabel = document.getElementById('edit-carbs-label');
                        const fiberLabel = document.getElementById('edit-fiber-label');
                        let perUnitText = '';
                        switch (unit) {
                            case 'g':
                                perUnitText = '100g';
                                break;
                            case 'ml':
                                perUnitText = '100ml';
                                break;
                            default:
                                perUnitText = `${unit}`;
                        }
                        kcalLabel.textContent = `Energy (kcal/${perUnitText})`;
                        proteinLabel.textContent = `Protein (g/${perUnitText})`;
                        fatLabel.textContent = `Fat (g/${perUnitText})`;
                        carbsLabel.textContent = `Carbs (g/${perUnitText})`;
                        fiberLabel.textContent = `Fiber (g/${perUnitText})`;
                    };
                    populateUnitSelect('edit-ingredient-unit', ing.serving_unit);
                    updateNutritionLabels(ing.serving_unit);
                    const overlay = document.getElementById(modalId);
                    overlay.querySelector('div.bg-white').addEventListener('click', e => e.stopPropagation());
                    document.getElementById('cancel-edit-ingredient').addEventListener('click', () => overlay.remove());
                    document.getElementById('edit-ingredient-form').addEventListener('submit', async (ev) => {
                        ev.preventDefault();
                        const newName = document.getElementById('edit-ingredient-name').value.trim();
                        const newShelfLife = document.getElementById('edit-ingredient-shelf-life').value.trim();
                        const newUnit = document.getElementById('edit-ingredient-unit').value.trim();
                        const newServingSize = document.getElementById('edit-ingredient-serving-size').value.trim();
                        let energy = document.getElementById('edit-ingredient-kcal').value.trim();
                        let protein = document.getElementById('edit-ingredient-protein').value.trim();
                        let carbs = document.getElementById('edit-ingredient-carbs').value.trim();
                        let fat = document.getElementById('edit-ingredient-fat').value.trim();
                        let fiber = document.getElementById('edit-ingredient-fiber').value.trim();
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
                        if (!energy) energy = 0;
                        if (!protein) protein = 0;
                        if (!carbs) carbs = 0;
                        if (!fat) fat = 0;
                        if (!fiber) fiber = 0;

                        try {
                            const params = new URLSearchParams({
                                name: newName,
                                shelf_life: newShelfLife,
                                serving_unit: newUnit,
                                serving_size: newServingSize,
                                energy: energy,
                                protein: protein,
                                carbs: carbs,
                                fat: fat,
                                fiber: fiber
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
                        try {
                            // 1. Await the fetch and store the response
                            const response = await fetch(`${API_BASE}/ingredients/${id}`, {
                                method: 'DELETE'
                            });

                            // 2. Check if the response status is OK (e.g., 200-299)
                            if (response.ok) {
                                // Success: re-render the list
                                renderShoppingList();
                            } else {
                                // Error: Parse the JSON error body from the backend
                                const errorData = await response.json();
                                // Display the detailed error message from the API
                                const recipes = errorData.detail;
                                window.alert(`Unable to delete '${ingName}'.\n${recipes}`);
                            }
                        } catch (error) {
                            // 3. Catch network errors
                            console.error('Failed to delete ingredient:', error);
                            window.alert('An error occurred. Could not delete the ingredient.');
                        }
                    }
                });
            });
            const toggleAllBtn = document.getElementById('toggle-all-details-btn');
            if (shelfLifeMode) {
                toggleAllBtn.style.display = 'none';
            } else {
                toggleAllBtn.style.display = 'inline-block';
                toggleAllBtn.addEventListener('click', () => {
                    const allDetails = listSection.querySelectorAll('details');
                    if (allDetails.length === 0) return;
                    const isCollapsing = toggleAllBtn.textContent.includes('Collapse');
                    allDetails.forEach(detail => {
                        detail.open = !isCollapsing;
                    });
                    toggleAllBtn.textContent = isCollapsing ? 'Expand All' : 'Collapse All';
                });
            }
            const addBtn = document.getElementById('add-ingredient-btn');
            const input = document.getElementById('new-ingredient-input');
            const shelfLifeInput = document.getElementById('new-ingredient-shelf-life');
            const servingUnit = document.getElementById('new-ingredient-unit');
            addBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = input.value.trim();
                const shelf_life = shelfLifeInput.value.trim();
                console.log(servingUnit.value);
                const serving_unit = servingUnit.value.trim();
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
                    let url = `${API_BASE}/ingredients?name=${encodeURIComponent(name)}&shelf_life=${encodeURIComponent(shelf_life)}&serving_unit=${encodeURIComponent(serving_unit)}`;
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
