const sheetID = '1NpL7Ip_oaj8FEi_zTTl-7t9hdWSGWrtHyfRYUvLyons';
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = 'Prices';
const qu = '';  // Empty query to select all data
const query = encodeURIComponent(qu);
const url = `${base}&sheet=${sheetName}&tq=${query}`;
const data = [];

let rightEyeData = [];
let leftEyeData = [];
let rebate = [];

const selections = {
  newEst: null,
  selfPay: null,
  fittingType: null,
  newToBrand: null
};

// Authentication state
let isAuthenticated = false;
let userEmail = null;

// Handle Google Sign-In response
function handleCredentialResponse(response) {
    console.log('Received Google Sign-In response');
    
    // Decode the credential response
    const responsePayload = jwt_decode(response.credential);
    console.log('Decoded response:', responsePayload);
    
    // Store user email
    userEmail = responsePayload.email;
    console.log('User email:', userEmail);
    
    // Check if the email is authorized
    const authorizedEmails = [
        // Add your email here - replace with your actual Google email
        'adrianvelascood@gmail.com'  // Your correct email address
    ];
    
    console.log('Checking authorization for:', userEmail);
    console.log('Authorized emails:', authorizedEmails);
    
    if (authorizedEmails.includes(userEmail)) {
        console.log('User authorized');
        isAuthenticated = true;
        // Hide login overlay and show main content
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-content').classList.remove('d-none');
        // Initialize the application
        init();
    } else {
        console.log('User not authorized');
        alert('Sorry, you are not authorized to access this application. Please contact the administrator.');
        // Sign out the user
        google.accounts.id.disableAutoSelect();
    }
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  if (!isAuthenticated) {
    console.log('User not authenticated');
    return;
  }

  fetch(url)
    .then(res => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      return res.text();
    })
    .then(rep => {
      const jsData = JSON.parse(rep.substr(47).slice(0, -2));
      console.log('Raw column names:', jsData.table.cols.map(col => col.label));
      
      const colz = [];
      jsData.table.cols.forEach(heading => {
        if (heading.label) {
          colz.push(heading.label.toLowerCase().replace(/\s/g, ''));
        }
      });
      console.log('Processed column names:', colz);
      
      jsData.table.rows.forEach(main => {
        const row = {};
        colz.forEach((ele, ind) => {
          row[ele] = (main.c[ind] != null) ? main.c[ind].v : '';
        });
        data.push(row);
      });

      // Debug the first few rows of data
      console.log('First 3 rows of data:', data.slice(0, 3));
      
      // Debug all unique manufacturer values
      const manufacturers = [...new Set(data.map(item => item.manufacturer).filter(Boolean))];
      console.log('All unique manufacturers:', manufacturers);
      console.log('Manufacturer values with their counts:', 
        manufacturers.map(m => ({
          manufacturer: m,
          count: data.filter(item => item.manufacturer === m).length
        }))
      );

      setupInputs?.(); // Only call if defined
      enableButtons();

      // Auto-populate manufacturer/brand dropdowns
      if (manufacturers.length) {
        const defaultManufacturer = manufacturers[0];
        const brands = [...new Set(data.filter(item => item.manufacturer === defaultManufacturer).map(item => item.brand).filter(Boolean))];
        populateDropdown('right-eye-dropdown', brands, defaultManufacturer, 'right');
        populateDropdown('left-eye-dropdown', brands, defaultManufacturer, 'left');
      }

      // ✅ Load fitting fees here
      loadFittingFees();
    })
    .catch(error => {
      console.error('Error:', error);
      if (error.message === 'Authentication required') {
        // Show login overlay if authentication is lost
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-content').classList.add('d-none');
      }
    });
}



const fittingFeesSheet = 'Fitting Fees';
const fittingFeesURL = `${base}&sheet=${encodeURIComponent(fittingFeesSheet)}&tq=`;
const fittingFeesData = [];

//Loading fitting fee data
function loadFittingFees() {
  fetch(fittingFeesURL)
    .then(res => res.text())
    .then(rep => {
      const jsData = JSON.parse(rep.substr(47).slice(0, -2));
      const colz = jsData.table.cols.map((col, idx) => {
        // Use a fallback name for empty columns to maintain alignment
        return col.label ? col.label.toLowerCase().replace(/\s/g, '') : `col${idx}`;
      });

      jsData.table.rows.forEach(main => {
        const row = {};
        colz.forEach((colName, i) => {
          row[colName] = main.c[i] ? main.c[i].v : '';
        });
        fittingFeesData.push(row);
      });

      console.log("Fitting Fees Loaded:", fittingFeesData);
    });
}


function enableButtons() {
  const manufacturerButtons = document.querySelectorAll('.manufacturer-btn');

  // Log initial state with more detail
  console.log('Initial data state:', {
    totalRows: data.length,
    manufacturers: [...new Set(data.map(item => item.manufacturer).filter(Boolean))],
    acuvueData: data.filter(item => {
      console.log('Initial Acuvue check:', {
        manufacturer: item.manufacturer,
        type: typeof item.manufacturer,
        length: item.manufacturer?.length,
        exactMatch: item.manufacturer === 'Acuvue',
        trimmedMatch: item.manufacturer?.trim() === 'Acuvue',
        lowerCaseMatch: item.manufacturer?.toLowerCase() === 'acuvue'
      });
      return item.manufacturer === 'Acuvue';
    })
  });

  manufacturerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selectedEye = button.dataset.eye;
      const selectedManufacturer = button.dataset.manufacturer;
      
      // Log state when button is clicked with more detail
      console.log('Button clicked state:', {
        selectedManufacturer,
        selectedManufacturerType: typeof selectedManufacturer,
        selectedManufacturerLength: selectedManufacturer?.length,
        totalRows: data.length,
        manufacturers: [...new Set(data.map(item => {
          console.log('Manufacturer in data:', {
            value: item.manufacturer,
            type: typeof item.manufacturer,
            length: item.manufacturer?.length
          });
          return item.manufacturer;
        }).filter(Boolean))],
        acuvueData: data.filter(item => {
          const matches = item.manufacturer === selectedManufacturer;
          console.log('Comparing manufacturers:', {
            dataManufacturer: item.manufacturer,
            selectedManufacturer,
            matches,
            dataType: typeof item.manufacturer,
            selectedType: typeof selectedManufacturer
          });
          return matches;
        })
      });

      // Remove 'selected' from all buttons for the same eye
      manufacturerButtons.forEach(btn => {
        if (btn.dataset.eye === selectedEye) {
          btn.classList.remove('selected');
        }
      });

      // Add 'selected' class to the clicked button
      button.classList.add('selected');

      // Filter and populate dropdown with more lenient comparison
      const filtered = data.filter(item => {
        const dataManufacturer = String(item.manufacturer || '').trim();
        const compareManufacturer = String(selectedManufacturer || '').trim();
        const matches = dataManufacturer === compareManufacturer;
        
        console.log('Filtering comparison:', {
          dataManufacturer,
          compareManufacturer,
          matches,
          dataType: typeof dataManufacturer,
          compareType: typeof compareManufacturer
        });
        
        return matches;
      });
      
      console.log('Filtered data for', selectedManufacturer, ':', filtered);
      const uniqueBrands = [...new Set(filtered.map(item => item.brand))].filter(Boolean);
      console.log('Unique brands for', selectedManufacturer, ':', uniqueBrands);

      if (selectedEye === 'right') {
        populateDropdown('right-eye-dropdown', uniqueBrands, selectedManufacturer, 'right');
      } else {
        populateDropdown('left-eye-dropdown', uniqueBrands, selectedManufacturer, 'left');
      }
    });
  });
}


function populateDropdown(containerId, uniqueBrands, selectedManufacturer, eye) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';  // Clear any existing dropdown

  const select = document.createElement('select');
  select.innerHTML = `<option value="">Select a brand</option>`;

  uniqueBrands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    select.appendChild(option);
  });

  container.appendChild(select);  // Append the dropdown to the container

  // Add event listener for when a brand is selected
  select.addEventListener('change', () => {
    const selectedBrand = select.value;
    console.log(`Selected Brand for ${eye} Eye: ${selectedBrand}`);

    const brandData = data.find(item =>
      item.brand === selectedBrand && item.manufacturer === selectedManufacturer
    );

    if (brandData) {
      if (eye === 'right') {
        rightEyeData = brandData;

        document.getElementById('brand1').textContent = rightEyeData.brand || "—";
        document.getElementById('boxes1').textContent = (rightEyeData['#ofboxesforyearsupply']) / 2 || "—";
        // Format price1 as $X.00
        const price1 = parseFloat(rightEyeData.priceperbox);
        document.getElementById('price1').textContent = isNaN(price1) ? "$0.00" : `$${price1.toFixed(2)}`;

        // ✅ Trigger rebate update if newToBrand is selected
        const normalizedValue = selections.newToBrand?.toLowerCase() === 'yes' ? 'Yes' : 'No';
        updateRebateDisplay(rightEyeData, normalizedValue);
      } else {
        leftEyeData = brandData;

        document.getElementById('brand2').textContent = leftEyeData.brand || "—";
        document.getElementById('boxes2').textContent = (leftEyeData['#ofboxesforyearsupply']) / 2 || "—";
        // Format price2 as $X.00
        const price2 = parseFloat(leftEyeData.priceperbox);
        document.getElementById('price2').textContent = isNaN(price2) ? "$0.00" : `$${price2.toFixed(2)}`;
      }
    }
  });
}



// This is getting the info from the buttons to put in the object "Selections"
// ...existing code...

// Only ONE event handler for toggle buttons!
document.querySelectorAll('.btn-group[data-group]').forEach(group => {
  const groupKey = group.dataset.group; // e.g., 'new-est'
  
  // Initialize the group - no selection by default
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.remove('selected');
  });

  group.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      const camelCaseKey = groupKey.replace(/-([a-z])/g, g => g[1].toUpperCase());

      // Deselect all buttons in this group only
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('selected');
      });
      
      // Select this button
      button.classList.add('selected');
      
      // Save selected value
      selections[camelCaseKey] = value;

      console.log(`${camelCaseKey} selected: ${selections[camelCaseKey]}`);

      // Call rebate update if it's the newToBrand toggle group
      if (camelCaseKey === 'newToBrand') {
        const normalizedValue = selections.newToBrand?.toLowerCase() === 'yes' ? 'Yes' : 'No';

        if (rightEyeData && Object.keys(rightEyeData).length > 0) {
          updateRebateDisplay(rightEyeData, normalizedValue);
        }
      }

      // Run fitting fee logic automatically
      determineFittingFee(selections, fittingFeesData);
    });
  });
});



function setupInputs() {
  const additionalFees = parseFloat(document.getElementById('additional-fees').value) || 0;
  const fittingCopay = parseFloat(document.getElementById('fitting-copay').value) || 0;
  const contactlensAllowance = parseFloat(document.getElementById('contact-lens-allowance').value) || 0;
  const fittingDiscountAmount = parseFloat(document.getElementById('fitting-discount-amount').value) || 0;
  const fittingDiscountPercent = parseFloat(document.getElementById('fitting-discount-percent').value) || 0;
  const irTraining = parseFloat(document.getElementById('ir-training').value) || 0;
  const additionalSavings = parseFloat(document.getElementById('additional-savings').value) || 0;

  // Save or use the values as needed here
  console.log({ additionalFees, fittingCopay, contactlensAllowance, fittingDiscountAmount });
}



function updateExamDetailsTable() {
  const examCopay = parseFloat(document.getElementById("exam-copay")?.value) || 0;
  const retinalImage = parseFloat(document.getElementById("retinal-image")?.value) || 0;
  const irTraining = parseFloat(document.getElementById("ir-training")?.value) || 0;
  const additionalFees = parseFloat(document.getElementById("additional-fees")?.value) || 0;

  const finalFittingFee = calculateFinalFittingFee(fittingFee);

  const totalExamOOP = examCopay + finalFittingFee + retinalImage + irTraining + additionalFees;

  const formatCurrency = val => `$${val.toFixed(2)}`;
  document.getElementById("examCopay").textContent = formatCurrency(examCopay);
  document.getElementById("clExam").textContent = formatCurrency(finalFittingFee);
  document.getElementById("retinalImage").textContent = formatCurrency(retinalImage);
  document.getElementById("irTraining").textContent = formatCurrency(irTraining);
  document.getElementById("additionalFeesDisplay").textContent = formatCurrency(additionalFees);
  document.getElementById("oopExam").textContent = formatCurrency(totalExamOOP);


 
  console.log(`Fitting Fee: ${fittingFee}`)
  console.log(`Final Fitting Fee: ${finalFittingFee}`)
  console.log(`Exam copay: ${examCopay}`);
  console.log(`Retinal Image: ${retinalImage}`);
  console.log(`IR: ${irTraining}`);
  console.log(`More Fees: ${additionalFees}`);
  console.log(`Total OOP: ${totalExamOOP}`);

}


// 🔁 Auto-update whenever related fields change
const examInputs = [
  "exam-copay",
  "retinal-price",
  "ir-training",
  "fitting-copay",
  "fitting-discount-amount",
  "fitting-discount-percent",
  "additional-fees",
];

examInputs.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener("input", updateExamDetailsTable);
  }
});


//Exam Detail Table Data Insertion

  function setupCurrencyInputListener(inputId, displayId) {
  const inputEl = document.getElementById(inputId);
  const displayEl = document.getElementById(displayId);

  if (!inputEl || !displayEl) {
    console.warn(`Elements not found: ${inputId}, ${displayId}`);
    return;
  }

  inputEl.addEventListener('input', () => {
    const value = parseFloat(inputEl.value);
    displayEl.textContent = isNaN(value) ? '---' : `$${value.toFixed(2)}`;
  });
}


setupCurrencyInputListener('exam-copay', 'examCopay');
setupCurrencyInputListener('retinal-image', 'retinalImage');
setupCurrencyInputListener('ir-training', 'irTraining');
setupCurrencyInputListener('contact-lens-allowance', 'contactLensAllowanceDisplay');
setupCurrencyInputListener('additional-fees', 'additionalFeesDisplay');
setupCurrencyInputListener('additional-savings', 'additionalSavingsDisplay');
updateRebateDisplay(rightEyeData, selections.newToBrand);


['fitting-copay', 'fitting-discount-amount', 'fitting-discount-percent'].forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', () => {
      updateFittingFeeDisplay();
    });
  }
});


const ids = [
  'exam-copay',
  'contact-lens-exam-copay',
  'retinal-image',
  'ir-training',
  'additional-fees'
];

function updateOOPExamTotal() {
  let total = 0;

  // Pull fitting fee (cl exam)
  const clExamText = document.getElementById('clExam')?.textContent || '';
  const clExamValue = parseFloat(clExamText.replace('$', '')) || 0;
  total += clExamValue;

  // Add all other inputs
  ids.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      const value = parseFloat(input.value);
      if (!isNaN(value)) {
        total += value;
      }
    }
  });

  const oopExamDisplay = document.getElementById('oopExam');
  if (oopExamDisplay) {
    oopExamDisplay.textContent = total > 0 ? `$${total.toFixed(2)}` : '---';
  }
}

// Attach event listeners to update total on input change
ids.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', updateOOPExamTotal);
  }
});

// Initialize total on page load
updateOOPExamTotal();

// Rebate function
function updateRebateDisplay(data, newToBrand) {
  if (!data) {
    console.warn("Missing data.");
    return;
  }

  const isNewToBrand = newToBrand?.toLowerCase() === "yes";
 
  rebate = parseFloat(
    isNewToBrand ? data.rebatesfornewwearer : data.yearsupplycurrent
  ) || 0;

  console.log(
    `Rebate (${isNewToBrand ? "New Wearer" : "Current Wearer"}): $${rebate}`
  );

  // Update existing display element
  const rebateDisplay = document.getElementById("rebateDisplay");
  if (rebateDisplay) {
    rebateDisplay.textContent = `$${rebate.toFixed(2)}`;
  }

  // ✅ ALSO update table cell
  const rebateTableCell = document.getElementById("rebate-display-cell");
  if (rebateTableCell) {
    rebateTableCell.textContent = `$${rebate.toFixed(2)}`;
  }

  return rebate;
}



let fittingFee = null;

function determineFittingFee(selections, fittingFeesData) {
  const { fittingType, selfPay, newEst } = selections;

  if ([fittingType, selfPay, newEst].some(val => val === undefined)) return;

  let dataIndex;
  if (fittingType === 'Sphere') {
    dataIndex = 0;
  } else if (fittingType === 'Toric') {
    dataIndex = 1;
  } else if (fittingType === 'MF/Mono') {
    dataIndex = 2;
  } else {
    console.warn("Invalid fittingType provided.");
    return;
  }

  const feeData = fittingFeesData[dataIndex];

  if (selfPay === 'Yes') {
    fittingFee = feeData.selfpay;
  } else if (selfPay === 'No') {
    if (newEst === 'New') {
      fittingFee = feeData.insnew;
    } else if (newEst === 'Est') {
      fittingFee = feeData.insestablished;
    }
  } else {
    console.warn("Invalid selections.selfPay");
  }

  updateFittingFeeDisplay();
}



let finalFittingFee= null;

function calculateFinalFittingFee(fee) {
  const copay = parseFloat(document.getElementById("fitting-copay").value) || 0;
  const discountAmount = parseFloat(document.getElementById("fitting-discount-amount").value) || 0;
  const discountPercent = parseFloat(document.getElementById("fitting-discount-percent").value) || 0;

  if (!fee) return 0;  // Prevent NaN if fee is not set yet

  if (copay > 0) return copay;
  if (discountAmount > 0) return fee - discountAmount;
  if (discountPercent > 0) return fee * (1 - discountPercent / 100);
  return fee;
}

function updateFittingFeeDisplay() {
  if (fittingFee == null) return; // wait till fittingFee is set

  const finalFee = calculateFinalFittingFee(fittingFee);
  document.getElementById("clExam").textContent = `$${finalFee.toFixed(2)}`;

    // 🔁 Recalculate OOP total after updating CL exam fee
  updateOOPExamTotal();
}




// List of input IDs to watch for changes
const inputIds = [
  'boxes1',
  'price1',
  'boxes2',
  'price2',
  'contact-lens-allowance',
  'additional-savings'
];

// Attach 'input' event listeners to all relevant inputs
inputIds.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', updateOOPContactsTotal(rebate));
  }
});

// Call once on page load to initialize display
document.addEventListener('DOMContentLoaded', updateOOPContactsTotal(rebate));



function parseDollarAmount(text) {
  // Remove $ and commas, parse float
  return parseFloat(text.replace(/[^0-9.-]+/g, '')) || 0;
}

function updateOOPContactsTotal(rebate) {
  // Get numbers from display elements
  const boxesRight = parseDollarAmount(document.getElementById('boxes1').textContent);
  const boxesLeft = parseDollarAmount(document.getElementById('boxes2').textContent);
  const priceRight = parseDollarAmount(document.getElementById('price1').textContent);
  const priceLeft = parseDollarAmount(document.getElementById('price2').textContent);
  const contactLensAllowance = parseDollarAmount(document.getElementById('contactLensAllowanceDisplay').textContent);
  const additionalSavings = parseDollarAmount(document.getElementById('additionalSavingsDisplay').textContent);

  // Calculate total price before discounts
  const totalPriceRight = boxesRight * priceRight;
  const totalPriceLeft = boxesLeft * priceLeft;
  const totalPrice = totalPriceRight + totalPriceLeft;

  // Apply discounts
  const totalDiscount = contactLensAllowance + additionalSavings;
  const oopContactsTotal = totalPrice - totalDiscount;

  // Make sure total is never negative
  const finalTotal = Math.max(0, oopContactsTotal);

  // Update the display
  document.getElementById('oopContacts').textContent = `$${finalTotal.toFixed(2)}`;

  console.log(`OOP Contacts Total: $${finalTotal.toFixed(2)}`);

  console.log(`${rebate}`);
  afterRebateTotal = finalTotal - rebate;
  console.log(`After Rebate Total: $${afterRebateTotal.toFixed(2)}`);

  // (Optional) Update other related fields here if needed
}


function attachDropdownListeners() {
  const rightSelect = document.querySelector('#right-eye-dropdown select');
  const leftSelect = document.querySelector('#left-eye-dropdown select');

  if (rightSelect) {
    rightSelect.addEventListener('change', () => {
      updateOOPContactsTotal();
    });
  }

  if (leftSelect) {
    leftSelect.addEventListener('change', () => {
      updateOOPContactsTotal();
    });
  }
}

// Add sign out functionality
function signOut() {
    isAuthenticated = false;
    userEmail = null;
    google.accounts.id.disableAutoSelect();
    // Show login overlay
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('main-content').classList.add('d-none');
    // Clear any sensitive data
    data.length = 0;
    rightEyeData = [];
    leftEyeData = [];
    rebate = [];
}

// Add JWT decode library
document.head.appendChild(document.createElement('script')).src = 'https://cdn.jsdelivr.net/npm/jwt-decode@3.1.2/build/jwt-decode.min.js';

// Add copy to left eye functionality
document.getElementById('copy-to-left-eye').addEventListener('click', () => {
    // Get the selected manufacturer from right eye
    const rightManufacturerBtn = document.querySelector('.manufacturer-btn[data-eye="right"].selected');
    if (!rightManufacturerBtn) {
        alert('Please select a manufacturer for the right eye first.');
        return;
    }
    const manufacturer = rightManufacturerBtn.dataset.manufacturer;

    // Get the selected brand from right eye dropdown
    const rightBrandSelect = document.querySelector('#right-eye-dropdown select');
    if (!rightBrandSelect || !rightBrandSelect.value) {
        alert('Please select a brand for the right eye first.');
        return;
    }
    const brand = rightBrandSelect.value;

    // Select the same manufacturer for left eye
    const leftManufacturerBtn = document.querySelector(`.manufacturer-btn[data-eye="left"][data-manufacturer="${manufacturer}"]`);
    if (leftManufacturerBtn) {
        // Deselect all left eye manufacturer buttons
        document.querySelectorAll('.manufacturer-btn[data-eye="left"]').forEach(btn => {
            btn.classList.remove('selected');
        });
        // Select the matching manufacturer button
        leftManufacturerBtn.classList.add('selected');
        // Trigger the manufacturer button click to update the brand dropdown
        leftManufacturerBtn.click();
    }

    // Wait for the brand dropdown to update
    setTimeout(() => {
        // Select the same brand in left eye dropdown
        const leftBrandSelect = document.querySelector('#left-eye-dropdown select');
        if (leftBrandSelect) {
            leftBrandSelect.value = brand;
            // Trigger change event to update pricing
            leftBrandSelect.dispatchEvent(new Event('change'));
        }
    }, 100);
});


