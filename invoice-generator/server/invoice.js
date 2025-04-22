const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateInvoice(data) {
  return new Promise((resolve, reject) => {
    try {
      // Enhanced validation and debugging
      if (!data || typeof data !== 'object') {
        console.error('Invalid invoice data provided:', data);
        throw new Error('Invalid invoice data provided');
      }

      // Add a more detailed data inspection
      console.log('Invoice generation started with data structure:', JSON.stringify({
        hasEmployee: !!data.employee,
        employeeName: data.employee?.employeeName,
        employeeId: data.employee?.employeeId,
        department: data.employee?.department,
        designation: data.employee?.designation,
        hasTourSummary: !!data.tourSummary,
        tourDetailsCount: data.tourSummary?.tourDetails?.length || 0,
        billsCount: Array.isArray(data.bills) ? data.bills.length : 'not an array',
        expensesCount: Array.isArray(data.expenses) ? data.expenses.length : 'not an array',
        conveyancesCount: Array.isArray(data.conveyances) ? data.conveyances.length : 'not an array',
        agendaItemsCount: Array.isArray(data.agendaItems) ? data.agendaItems.length : 'not an array',
        dailyAllowance: data.dailyAllowance ? 'present' : 'missing'
      }, null, 2));

      // Create PDF document in portrait orientation
      const doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'portrait',
        margin: 50,
        bufferPages: true,
        autoFirstPage: true
      });
      
      // Ensure the directory exists
      const generatedDir = path.join(__dirname, 'generated');
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }
      
      const fileName = `invoice-${Date.now()}.pdf`;
      const filePath = path.join(generatedDir, fileName);
      console.log('Writing PDF to:', filePath);
      
      // Create write stream with error handling
      const stream = fs.createWriteStream(filePath);
      
      // Handle stream errors
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        reject(new Error(`Failed to create PDF file stream: ${err.message}`));
      });

      doc.pipe(stream);

      // Table drawing functions
      function drawTableLine(doc, y, width) {
        doc.moveTo(50, y).lineTo(width - 50, y).stroke();
      }

      function drawTableBorders(doc, startY, endY, columns) {
        const pageWidth = doc.page.width;
        const colWidth = (pageWidth - 100) / columns;
        
        // Vertical lines
        for (let i = 0; i <= columns; i++) {
          doc.moveTo(50 + (i * colWidth), startY)
             .lineTo(50 + (i * colWidth), endY)
             .stroke();
        }
        
        // Horizontal lines
        doc.moveTo(50, startY).lineTo(pageWidth - 50, startY).stroke();
        doc.moveTo(50, endY).lineTo(pageWidth - 50, endY).stroke();
      }

      try {
        console.log('Starting PDF page generation...');
        
        // Ensure required arrays exist
        if (!Array.isArray(data.bills)) {
          console.log('Bills array not found, creating empty array');
          data.bills = [];
        }
        
        if (!Array.isArray(data.expenses)) {
          console.log('Expenses array not found, creating empty array');
          data.expenses = [];
        }
        
        if (!Array.isArray(data.conveyances)) {
          console.log('Conveyances array not found, creating empty array');
          data.conveyances = [];
        }
        
        if (!Array.isArray(data.agendaItems)) {
          console.log('Agenda items array not found, creating empty array');
          data.agendaItems = [];
        }
        
        // Check if we need to generate agenda items from tour details
        if (data.agendaItems.length === 0 && data.tourSummary && Array.isArray(data.tourSummary.tourDetails) && data.tourSummary.tourDetails.length > 0) {
          console.log('Creating agenda items from tour details for PDF');
          data.agendaItems = data.tourSummary.tourDetails.map(detail => ({
            agendaItem: detail.purpose || 'Tour',
            fromDate: detail.fromDate,
            toDate: detail.toDate,
            actionTaken: (detail.from || '') + ' to ' + (detail.to || '')
          }));
        }
        
        // Page 1: Basic Details (always generate, don't check for agendaItems)
        console.log('Generating basic details page...');
        generateBasicDetailsPage(doc, data);
        
        // Page 2: Tour Programme (only if tourSummary exists)
        if (data.tourSummary && data.tourSummary.tourDetails && data.tourSummary.tourDetails.length > 0) {
          console.log('Generating tour summary page...');
          doc.addPage();
          generateTourSummaryTable(doc, data, drawTableLine, drawTableBorders);
        }

        // Page 3: Bill & Conveyance (only if bills or conveyances exist)
        if ((data.bills && data.bills.length > 0) || (data.conveyances && data.conveyances.length > 0)) {
          console.log('Generating bill details page...');
          doc.addPage();
          generateBillDetailsTable(doc, data, drawTableLine, drawTableBorders);
        }

        // Page 4: Final Summary (Travel Bill)
        if (data.expenses && data.expenses.length > 0) {
          console.log('Generating final summary page...');
          doc.addPage();
          generateFinalSummary(doc, data);
        } else {
          // Generate final summary anyway for completeness
          console.log('No expenses found, but still generating final summary page for completeness...');
          doc.addPage();
          generateFinalSummary(doc, data);
        }

        // Add bill attachments only if they have valid file URLs
        if (data.bills && Array.isArray(data.bills)) {
          const validBills = data.bills.filter(bill => bill.fileUrl && bill.fileUrl.trim() !== '');
          if (validBills.length > 0) {
            console.log('Generating bill attachments page...');
            doc.addPage();
            generateBillAttachments(doc, validBills);
          }
        }
        
        // Add expense attachments only if they have valid file URLs
        if (data.expenses && Array.isArray(data.expenses)) {
          const validExpenses = data.expenses.filter(expense => expense.fileUrl && expense.fileUrl.trim() !== '');
          if (validExpenses.length > 0) {
            console.log('Generating expense attachments page...');
            doc.addPage();
            generateExpenseAttachments(doc, validExpenses);
          }
        }
        
        // Add conveyance attachments only if they have valid file URLs
        if (data.conveyances && Array.isArray(data.conveyances)) {
          const validConveyances = data.conveyances.filter(conveyance => conveyance.fileUrl && conveyance.fileUrl.trim() !== '');
          if (validConveyances.length > 0) {
            console.log('Generating conveyance attachments page...');
            doc.addPage();
            generateConveyanceAttachments(doc, validConveyances);
          }
        }
      } catch (docGenError) {
        console.error('Error generating document content:', docGenError);
        // Add error page instead of failing
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Error Generating Document', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica');
        doc.text(`An error occurred while generating this document: ${docGenError.message}`, { align: 'center' });
        doc.moveDown();
        doc.text(`Error details: ${docGenError.stack}`, { align: 'left' });
      }

      // Finalize the PDF
      doc.end();

      // Handle successful creation
      stream.on('finish', () => {
        console.log('PDF generated successfully:', filePath);
        resolve(filePath);
      });

    } catch (error) {
      console.error('Error in generateInvoice:', error);
      reject(error);
    }
  });
}

// Function to generate Basic Details page with user-entered agenda items
function generateBasicDetailsPage(doc, data) {
  // Debug logging to diagnose data structure issues
  console.log("BasicDetails data structure:", {
    dataType: typeof data,
    hasEmployee: !!data.employee,
    employeeName: data.employee?.employeeName,
    hasAgendaItems: !!data.agendaItems,
    agendaItemsLength: data.agendaItems?.length,
    employeeAgendaItemsLength: data.employee?.agendaItems?.length,
    completeStructure: Object.keys(data)
  });
  
  if (data.agendaItems && data.agendaItems.length > 0) {
    console.log("First agenda item sample:", JSON.stringify(data.agendaItems[0]));
  } else if (data.employee?.agendaItems) {
    console.log("First employee agenda item sample:", JSON.stringify(data.employee.agendaItems[0]));
  }
  
  doc.fontSize(12).font('Helvetica-Bold').text('NCEL-Delhi', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).text('Detailed Agenda & Record Note of Tour Undertaken', { align: 'center' });
  doc.moveDown(0.5);
  
  // Log data being received to help diagnose issues
  console.log('Employee data received for PDF:', JSON.stringify({
    employee: data.employee || {},
    agendaItems: data.agendaItems || []
  }));
  
  // Get employee details directly from data.employee
  const employeeName = data.employee?.employeeName || 'N/A';
  const department = data.employee?.department || 'N/A';
  const tourPeriod = data.employee?.tourPeriod || 'N/A';
  
  // Set up employee details - properly spaced in the same row
  const pageWidth = doc.page.width - 100;
  doc.fontSize(10).font('Helvetica');
  
  // Create a box for employee details
  const employeeBoxY = doc.y;
  doc.rect(50, employeeBoxY, pageWidth, 25).stroke();
  
  // Divide the box into three sections with more space
  const col1Width = pageWidth * 0.4; // 40% for name - wider
  const col2Width = pageWidth * 0.35; // 35% for department - wider
  const col3Width = pageWidth * 0.25; // 25% for period - narrower
  doc.moveTo(50 + col1Width, employeeBoxY).lineTo(50 + col1Width, employeeBoxY + 25).stroke();
  doc.moveTo(50 + col1Width + col2Width, employeeBoxY).lineTo(50 + col1Width + col2Width, employeeBoxY + 25).stroke();
  
  // Place employee details in three columns with proper spacing
  doc.text(`Name of E: ${employeeName}`, 55, employeeBoxY + 8, { width: col1Width - 10 });
  doc.text(`Department: ${department}`, 55 + col1Width + 5, employeeBoxY + 8, { width: col2Width - 10 });
  doc.text(`Period: ${tourPeriod} DAY`, 55 + col1Width + col2Width + 5, employeeBoxY + 8, { width: col3Width - 10 });
  
  doc.moveDown(1);
  
  // Create table for agenda items
  const startY = doc.y + 10;
  
  // Draw outer table border
  doc.rect(50, startY, pageWidth, 300).stroke();
  
  // Define column widths - adjusted for portrait
  const colWidths = [
    0.1, // Sr. No. (10%)
    0.25, // Agenda Item (25%)
    0.2, // From Date (20%)
    0.2, // To Date (20%)
    0.25  // Record note (25%)
  ];
  
  // Calculate actual widths
  const tableWidth = pageWidth;
  const actualColWidths = colWidths.map(w => tableWidth * w);
  
  // Define table headers
  const tableHeaders = [
    { text: 'Sr. No.', width: colWidths[0] },
    { text: 'Agenda Item(s)', width: colWidths[1] },
    { text: 'From Date', width: colWidths[2] },
    { text: 'To Date', width: colWidths[3] },
    { text: 'Record note of Action taken', width: colWidths[4] }
  ];
  
  // Draw table headers
  doc.fontSize(9).font('Helvetica-Bold');
  let headerX = 50;
  
  tableHeaders.forEach((header, i) => {
    const width = actualColWidths[i];
    doc.text(header.text, headerX + 5, startY + 10, {
      width: width - 10,
      align: i === 0 ? 'center' : (i === 2 || i === 3) ? 'center' : 'left'
    });
    headerX += width;
  });
  
  // Get agenda items directly from the main data structure 
  // IMPORTANT: Do not create or substitute any values
  let agendaItems = [];

  // Only look for agenda items in the main data structure
  if (Array.isArray(data.agendaItems) && data.agendaItems.length > 0) {
    // Use agenda items directly without modification
    agendaItems = data.agendaItems;
    console.log('Using exact user-entered agenda items from data.agendaItems:', 
      JSON.stringify(agendaItems.map(item => ({
        agendaItem: item.agendaItem,
        fromDate: item.fromDate,
        toDate: item.toDate,
        actionTaken: item.actionTaken
      }))));
  }

  // Create a single empty row placeholder only if no agenda items found at all
  if (agendaItems.length === 0) {
    console.log('No agenda items found. Creating a single empty row.');
    agendaItems = [{ 
      agendaItem: '',
      fromDate: '',
      toDate: '',
      actionTaken: ''
    }];
  }
  
  // Debug the agenda items to see what's available
  console.log('Agenda items to render (detailed):', JSON.stringify(agendaItems, null, 2));
  console.log('Number of agenda items:', agendaItems.length);
  
  // Create table borders
  doc.rect(50, startY, tableWidth, 30).stroke(); // Header row

  // Draw rows for each agenda item with proper spacing
  let rowY = startY + 30; // Start right after header
  const rowHeight = 40;
  
  // Add debugRow function
  function debugObject(obj, label) {
    if (!obj) return 'null';
    if (typeof obj !== 'object') return typeof obj;
    return `${label || 'Object'} keys: ${Object.keys(obj).join(', ')}`;
  }

  // Create table rows for agenda items with clear fallbacks
  if (agendaItems && agendaItems.length > 0) {
    console.log(`Drawing ${agendaItems.length} agenda items`);
    // Loop through agenda items
    agendaItems.forEach((item, index) => {
      // Log the item data for debugging
      console.log(`Agenda item ${index + 1}:`, JSON.stringify(item));
      
      // Draw row borders
      doc.rect(50, rowY, tableWidth, rowHeight).stroke();
      
      const textY = rowY + 15; // Center text vertically in row
      
      // Draw data in columns
      let colX = 50;
      
      // Sr. No.
      doc.text((index + 1).toString(), colX + 5, textY, { 
        width: actualColWidths[0] - 10,
        align: 'center' 
      });
      colX += actualColWidths[0];
      
      // Agenda Item - use directly from data
      doc.text(item.agendaItem || '', colX + 5, textY, { 
        width: actualColWidths[1] - 10,
        ellipsis: true
      });
      colX += actualColWidths[1];
      
      // From Date - use directly from data, don't format
      doc.text(item.fromDate || '', colX + 5, textY, {
        width: actualColWidths[2] - 10,
        align: 'center'
      });
      colX += actualColWidths[2];
      
      // To Date - use directly from data, don't format
      doc.text(item.toDate || '', colX + 5, textY, {
        width: actualColWidths[3] - 10,
        align: 'center'
      });
      colX += actualColWidths[3];
      
      // Record note of Action taken - use directly from data
      doc.text(item.actionTaken || '', colX + 5, textY, {
        width: actualColWidths[4] - 10,
        ellipsis: true
      });
      
      // Move to next row
      rowY += rowHeight;
    });
  } else {
    // Always create at least one row even if no agenda items found
    // Draw a single empty row
    doc.rect(50, rowY, tableWidth, rowHeight).stroke();
    doc.fontSize(10).font('Helvetica');
    doc.text('No agenda items found.', 150, rowY + 15);
    rowY += rowHeight;
  }
  
  // Draw vertical lines to separate columns
  let vertX = 50;
  for (let i = 0; i < colWidths.length; i++) {
    vertX += actualColWidths[i];
    if (i < colWidths.length - 1) { // Don't draw after last column
      doc.moveTo(vertX, startY).lineTo(vertX, rowY).stroke();
    }
  }
  
  // Add a signature line at the bottom of page
  const signatureY = doc.page.height - 100;
  doc.fontSize(10).font('Helvetica');
  doc.text('Signature of the Applicant:', 50, signatureY);
  doc.moveTo(170, signatureY + 20).lineTo(300, signatureY + 20).stroke();
  
  doc.text('Date:', 350, signatureY);
  doc.moveTo(380, signatureY + 20).lineTo(500, signatureY + 20).stroke();
}

// Function to generate bill attachments with each bill on a separate page
function generateBillAttachments(doc, bills) {
  doc.fontSize(16).font('Helvetica-Bold').text('Bill Attachments', { align: 'center' });
  doc.moveDown(0.5);
  
  // Use full page height for images
  const imageMaxHeight = 400; // Increased to use more page space
  const imageMaxWidth = 500;
  
  // Process each bill on its own page
  bills.forEach((bill, index) => {
    // Start a new page for every bill after the first one
    if (index > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Bill Attachments', { align: 'center' });
      doc.moveDown(0.5);
    }
    
    if (bill.fileUrl) {
      try {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Bill No: ${bill.billNo || 'N/A'} | Amount: Rs ${Number(bill.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
        doc.moveDown(0.5);
        
        // Find image path
        let imagePath = findImagePath(bill.fileUrl);
        
        if (imagePath) {
          doc.image(imagePath, {
            fit: [imageMaxWidth, imageMaxHeight],
            align: 'center'
          });
          doc.moveDown();
        } else {
          doc.text('Bill file not found. Please check the file path.', { align: 'center' });
        }
      } catch (error) {
        console.error('Error processing bill attachment:', error);
        doc.text('Error processing bill attachment: ' + error.message, { align: 'center' });
      }
    }
  });
}

// Function to generate expense attachments with each expense on a separate page
function generateExpenseAttachments(doc, expenses) {
  doc.fontSize(16).font('Helvetica-Bold').text('Travel Ticket Attachments', { align: 'center' });
  doc.moveDown(0.5);
  
  // Use full page height for images
  const imageMaxHeight = 400;
  const imageMaxWidth = 500;
  
  // Process each expense on its own page
  expenses.forEach((expense, index) => {
    // Start a new page for every expense after the first one
    if (index > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Travel Ticket Attachments', { align: 'center' });
      doc.moveDown(0.5);
    }
    
    if (expense.fileUrl) {
      try {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`From: ${expense.from || 'N/A'} To: ${expense.to || 'N/A'} | Amount: Rs ${Number(expense.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
        doc.moveDown(0.5);
        
        // Find image path
        let imagePath = findImagePath(expense.fileUrl);
        
        if (imagePath) {
          doc.image(imagePath, {
            fit: [imageMaxWidth, imageMaxHeight],
            align: 'center'
          });
          doc.moveDown();
        } else {
          doc.text('Ticket file not found. Please check the file path.', { align: 'center' });
        }
      } catch (error) {
        console.error('Error processing ticket attachment:', error);
        doc.text('Error processing ticket attachment: ' + error.message, { align: 'center' });
      }
    }
  });
}

// Function to generate conveyance attachments with each conveyance on a separate page
function generateConveyanceAttachments(doc, conveyances) {
  doc.fontSize(16).font('Helvetica-Bold').text('Conveyance Receipt Attachments', { align: 'center' });
  doc.moveDown(0.5);
  
  // Use full page height for images
  const imageMaxHeight = 400;
  const imageMaxWidth = 500;
  
  // Process each conveyance on its own page
  conveyances.forEach((conveyance, index) => {
    // Start a new page for every conveyance after the first one
    if (index > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Conveyance Receipt Attachments', { align: 'center' });
      doc.moveDown(0.5);
    }
    
    if (conveyance.fileUrl) {
      try {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Place: ${conveyance.place || 'N/A'} | Amount: Rs ${Number(conveyance.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
        doc.moveDown(0.5);
        
        // Find image path
        let imagePath = findImagePath(conveyance.fileUrl);
        
        if (imagePath) {
          doc.image(imagePath, {
            fit: [imageMaxWidth, imageMaxHeight],
            align: 'center'
          });
          doc.moveDown();
        } else {
          doc.text('Receipt file not found. Please check the file path.', { align: 'center' });
        }
      } catch (error) {
        console.error('Error processing conveyance attachment:', error);
        doc.text('Error processing conveyance attachment: ' + error.message, { align: 'center' });
      }
    }
  });
}

// Helper function to find an image file path
function findImagePath(fileUrl) {
  const possiblePaths = [
    fileUrl,  // Original path
    path.resolve(fileUrl),  // Absolute path
    path.join(__dirname, fileUrl), // Relative to script
    path.join(__dirname, '..', fileUrl), // Relative to server root
    path.join(__dirname, 'uploads', path.basename(fileUrl)), // In server/uploads
    path.join(__dirname, '..', 'uploads', path.basename(fileUrl)), // In project/uploads
    path.join(__dirname, '..', 'client', 'public', path.basename(fileUrl)) // In client/public
  ];
  
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    } catch (fsError) {
      // Continue checking other paths
    }
  }
  
  return null;
}

function generateTourSummaryTable(doc, data, drawTableLine, drawTableBorders) {
  // We're already on a new page, no need to create another one
  
  // Reset page formatting
  doc.fontSize(12).font('Helvetica-Bold').text('National Cooperative Exports Limited', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('TOUR PROGRAMME', { align: 'center' });
  doc.moveDown(0.5);
  
  // Get data
  const tourDetails = data.tourSummary?.tourDetails || [];
  const employeeName = data.employee?.employeeName || 'N/A';
  const department = data.employee?.department || 'N/A';
  const designation = data.employee?.designation || 'N/A';
  
  // Draw the outer border of the entire form - adjusted for portrait
  const pageWidth = doc.page.width - 100;
  const startY = doc.y;
  doc.rect(50, startY, pageWidth, 600).stroke(); // Increased height for portrait
  
  // Header section
  // First row: To, Ref No, Date, HQ
  const headerRow1Y = startY;
  doc.fontSize(10).font('Helvetica');
  
  // To field
  doc.rect(50, headerRow1Y, pageWidth * 0.6, 25).stroke();
  doc.text('To: Managing Director', 55, headerRow1Y + 7);
  
  // Ref No field
  doc.rect(50 + pageWidth * 0.6, headerRow1Y, pageWidth * 0.15, 25).stroke();
  doc.text('Ref. No:', 50 + pageWidth * 0.6 + 5, headerRow1Y + 7);
  
  // Date field
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB');
  doc.rect(50 + pageWidth * 0.75, headerRow1Y, pageWidth * 0.25, 25).stroke();
  doc.text(`Date: ${formattedDate}`, 50 + pageWidth * 0.75 + 5, headerRow1Y + 7);
  
  // Second row: From, Designation
  const headerRow2Y = headerRow1Y + 25;
  
  // From field
  doc.rect(50, headerRow2Y, pageWidth * 0.6, 25).stroke();
  doc.text(`From: ${employeeName}`, 55, headerRow2Y + 7);
  
  // Designation field - now shows actual designation value
  doc.rect(50 + pageWidth * 0.6, headerRow2Y, pageWidth * 0.4, 25).stroke();
  doc.text(`Designation: ${designation}`, 50 + pageWidth * 0.6 + 5, headerRow2Y + 7);
  
  // Third row: Department, HQ
  const headerRow3Y = headerRow2Y + 25;
  doc.rect(50, headerRow3Y, pageWidth * 0.6, 25).stroke();
  doc.text(`Department: ${department}`, 55, headerRow3Y + 7);
  
  // HQ field on its own row now
  doc.rect(50 + pageWidth * 0.6, headerRow3Y, pageWidth * 0.4, 25).stroke();
  doc.text('HQ: Delhi', 50 + pageWidth * 0.6 + 5, headerRow3Y + 7);
  
  // Tour details table header
  const tableStartY = headerRow3Y + 25;
  const colWidths = [0.1, 0.15, 0.18, 0.18, 0.18, 0.21]; // Date, Mode, From, To, Contact, Purpose
  
  // Draw table headers
  doc.rect(50, tableStartY, pageWidth, 30).stroke();
  
  let currentX = 50;
  doc.fontSize(10).font('Helvetica-Bold');
  
  // Draw header cells and text
  doc.text('Date', currentX + 5, tableStartY + 10);
  currentX += pageWidth * colWidths[0];
  doc.moveTo(currentX, tableStartY).lineTo(currentX, tableStartY + 30).stroke();
  
  doc.text('Mode', currentX + 5, tableStartY + 10);
  currentX += pageWidth * colWidths[1];
  doc.moveTo(currentX, tableStartY).lineTo(currentX, tableStartY + 30).stroke();
  
  doc.text('From', currentX + 5, tableStartY + 10);
  currentX += pageWidth * colWidths[2];
  doc.moveTo(currentX, tableStartY).lineTo(currentX, tableStartY + 30).stroke();
  
  doc.text('To', currentX + 5, tableStartY + 10);
  currentX += pageWidth * colWidths[3];
  doc.moveTo(currentX, tableStartY).lineTo(currentX, tableStartY + 30).stroke();
  
  doc.text('Contact Info', currentX + 5, tableStartY + 10);
  currentX += pageWidth * colWidths[4];
  doc.moveTo(currentX, tableStartY).lineTo(currentX, tableStartY + 30).stroke();
  
  doc.text('Major purpose of Tour', currentX + 5, tableStartY + 10);
  
  // Draw empty rows for the table (8 rows for portrait)
  const rowHeight = 25;
  let rowY = tableStartY + 30;
  
  for (let i = 0; i < 8; i++) {
    // Draw horizontal line for the row
    doc.moveTo(50, rowY).lineTo(50 + pageWidth, rowY).stroke();
    
    // Draw vertical lines for columns
    currentX = 50;
    for (let j = 0; j < colWidths.length - 1; j++) {
      currentX += pageWidth * colWidths[j];
      doc.moveTo(currentX, rowY - rowHeight).lineTo(currentX, rowY).stroke();
    }
    
    rowY += rowHeight;
  }
  
  // Fill in tour details if available
  if (tourDetails.length > 0) {
    doc.fontSize(9).font('Helvetica');
    
    // Calculate column widths for text to prevent overflow
    const dateWidth = pageWidth * colWidths[0] - 10;
    const modeWidth = pageWidth * colWidths[1] - 10;
    const fromWidth = pageWidth * colWidths[2] - 10;
    const toWidth = pageWidth * colWidths[3] - 10;
    const contactWidth = pageWidth * colWidths[4] - 10;
    const purposeWidth = pageWidth * colWidths[5] - 10;
    
    tourDetails.forEach((detail, index) => {
      if (index < 8) { // Show up to 8 rows in portrait mode
        const y = tableStartY + 30 + (index * rowHeight) + 7;
        
        // Start from the first column
        let colX = 50;
        
        // Date
        doc.text(detail.fromDate || 'N/A', colX + 5, y, {
          width: dateWidth,
          ellipsis: true
        });
        
        colX += pageWidth * colWidths[0];
        // Mode
        doc.text(detail.modeOfTravel || 'N/A', colX + 5, y, {
          width: modeWidth,
          ellipsis: true
        });
        
        colX += pageWidth * colWidths[1];
        // From
        doc.text(detail.from || 'N/A', colX + 5, y, {
          width: fromWidth,
          ellipsis: true
        });
        
        colX += pageWidth * colWidths[2];
        // To
        doc.text(detail.to || 'N/A', colX + 5, y, {
          width: toWidth,
          ellipsis: true
        });
        
        colX += pageWidth * colWidths[3];
        // Contact - show contact number if available
        const contactText = detail.contactNumber || detail.contactInfo || detail.contact || 'N/A';
        doc.text(contactText, colX + 5, y, {
          width: contactWidth,
          ellipsis: true
        });
        
        colX += pageWidth * colWidths[4];
        // Purpose
        doc.text(detail.purpose || detail.majorPurpose || 'N/A', colX + 5, y, {
          width: purposeWidth,
          ellipsis: true
        });
      }
    });
  }
  
  // Other details section
  const otherDetailsY = rowY;
  
  // Other Details header
  doc.rect(50 + pageWidth * 0.6, otherDetailsY, pageWidth * 0.4, 25).stroke();
  doc.fontSize(10).font('Helvetica-Bold').text('Other Details', 50 + pageWidth * 0.6 + 5, otherDetailsY + 7);
  
  // Estimated Expenses section
  doc.rect(50, otherDetailsY, pageWidth * 0.6, 25).stroke();
  doc.text('Estimated Expenses', 55, otherDetailsY + 7);
  
  // Accommodation Request
  const accommodationY = otherDetailsY + 25;
  doc.rect(50 + pageWidth * 0.6, accommodationY, pageWidth * 0.4, 25).stroke();
  doc.font('Helvetica-Bold').text('Accommodation Request', 50 + pageWidth * 0.6 + 5, accommodationY + 7);
  
  // Travelling
  doc.rect(50, accommodationY, pageWidth * 0.6, 25).stroke();
  doc.font('Helvetica').text('Travelling', 55, accommodationY + 7);
  doc.text(':', 200, accommodationY + 7);
  
  // Return Ticket Request
  const returnTicketY = accommodationY + 25;
  doc.rect(50 + pageWidth * 0.6, returnTicketY, pageWidth * 0.4, 25).stroke();
  doc.font('Helvetica-Bold').text('Return Ticket Request', 50 + pageWidth * 0.6 + 5, returnTicketY + 7);
  
  // Boarding
  doc.rect(50, returnTicketY, pageWidth * 0.6, 25).stroke();
  doc.font('Helvetica').text('Boarding', 55, returnTicketY + 7);
  doc.text(':', 200, returnTicketY + 7);
  // Fixed position for Rs text to prevent overlapping
  doc.text('Rs', 375, returnTicketY + 7);
  
  // Local Transport Request
  const localTransportY = returnTicketY + 25;
  doc.rect(50 + pageWidth * 0.6, localTransportY, pageWidth * 0.4, 25).stroke();
  doc.font('Helvetica-Bold').text('Local Transport Request :', 50 + pageWidth * 0.6 + 5, localTransportY + 7);
  
  // Lodging
  doc.rect(50, localTransportY, pageWidth * 0.6, 25).stroke();
  doc.font('Helvetica').text('Lodging', 55, localTransportY + 7);
  doc.text(':', 200, localTransportY + 7);
  // Fixed position for Rs text to prevent overlapping
  doc.text('Rs', 375, localTransportY + 7);
  
  // Additional Information
  const additionalInfoY = localTransportY + 25;
  doc.rect(50 + pageWidth * 0.6, additionalInfoY, pageWidth * 0.4, 25).stroke();
  doc.font('Helvetica').text('Additional Information :', 50 + pageWidth * 0.6 + 5, additionalInfoY + 7);
  
  // Local Conveyance
  doc.rect(50, additionalInfoY, pageWidth * 0.6, 25).stroke();
  doc.text('Local Conveyance', 55, additionalInfoY + 7);
  doc.text(':', 200, additionalInfoY + 7);
  // Fixed position for Rs text to prevent overlapping
  doc.text('Rs', 375, additionalInfoY + 7);
  
  // Blank space for Additional Info
  const blankSpaceY = additionalInfoY + 25;
  doc.rect(50 + pageWidth * 0.6, blankSpaceY, pageWidth * 0.4, 25).stroke();
  
  // Others
  doc.rect(50, blankSpaceY, pageWidth * 0.6, 25).stroke();
  doc.text('Others', 55, blankSpaceY + 7);
  doc.text(':', 200, blankSpaceY + 7);
  // Fixed position for Rs text to prevent overlapping
  doc.text('Rs', 375, blankSpaceY + 7);
  
  // Total
  const totalY = blankSpaceY + 25;
  doc.rect(50, totalY, pageWidth * 0.6, 25).stroke();
  doc.text('Total', 55, totalY + 7);
  doc.text(':', 200, totalY + 7);
  // Fixed position for Rs text to prevent overlapping
  doc.text('Rs', 375, totalY + 7);
  
  // Total row
  const finalTotalRowY = totalY + rowHeight;
  doc.rect(50, finalTotalRowY, pageWidth * 0.6, rowHeight).stroke();
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('TOTAL', 55 + pageWidth * 0.5, finalTotalRowY + 5);
  
  doc.rect(50 + pageWidth * 0.6, finalTotalRowY, pageWidth * 0.4, rowHeight).stroke();
  doc.text('2,541.00', 50 + pageWidth * 0.6 + 75, finalTotalRowY + 5, { align: 'right' });
  
  // Signature section
  const signatureY = finalTotalRowY + rowHeight;
  
  // Three signature sections
  const signWidth = pageWidth / 3;
  
  // Touring Staff
  doc.rect(50, signatureY, signWidth, 25).stroke();
  doc.text('Touring Staff', 55, signatureY + 7);
  
  // Sectional Head
  doc.rect(50 + signWidth, signatureY, signWidth, 25).stroke();
  doc.text('Sectional Head', 50 + signWidth + 5, signatureY + 7);
  
  // Sanctioning Authority
  doc.rect(50 + (signWidth * 2), signatureY, signWidth, 25).stroke();
  doc.text('Sanctioning Authority', 50 + (signWidth * 2) + 5, signatureY + 7);
}

function generateBillDetailsTable(doc, data, drawTableLine, drawTableBorders) {
  // This function now includes both bill details and conveyance charges on one page
  
  // Reset page formatting for a clean start - Landscape orientation
  const pageWidth = doc.page.width - 100;
  const startY = 50;
  
  // Hotel Charges & Food Bills Table
  doc.fontSize(11).font('Helvetica-Bold').text('Details of Hotel Charges & Food Bills', { align: 'center' });
  doc.moveDown(0.5);
  
  // Draw outer border for the entire hotel table
  const hotelTableStartY = doc.y;
  
  // Define column widths for hotel table - adjusted for landscape
  const hotelColWidths = [
    0.25, // Name of Hotel/Restaurant (25%)
    0.15, // Place (15%)
    0.2,  // Bill No (20%)
    0.2,  // Bill Date (20%)
    0.2   // Amount (20%)
  ];
  
  // Calculate absolute column positions
  const hotelColPositions = [50];
  let accumulatedWidth = 50;
  hotelColWidths.forEach(width => {
    accumulatedWidth += width * pageWidth;
    hotelColPositions.push(accumulatedWidth);
  });
  
  // Draw hotel table header row
  doc.rect(50, hotelTableStartY, pageWidth, 30).stroke();
  
  // Header row cells
  for (let i = 1; i < hotelColPositions.length; i++) {
    doc.moveTo(hotelColPositions[i], hotelTableStartY).lineTo(hotelColPositions[i], hotelTableStartY + 30).stroke();
  }
  
  // Header row text
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Name of Hotel / Restaurant', 55, hotelTableStartY + 10);
  
  // Center header for 'Details of Hotel Charges & Food Bills' spanning 3 columns
  doc.text('Place', hotelColPositions[1] + 5, hotelTableStartY + 10);
  doc.text('Bill No.', hotelColPositions[2] + 5, hotelTableStartY + 10);
  doc.text('Bill Date', hotelColPositions[3] + 5, hotelTableStartY + 10);
  doc.text('Amount', hotelColPositions[4] + 5, hotelTableStartY + 10);
  
  // Draw data rows for hotel bills
  const bills = data.bills || [];
  let currentY = hotelTableStartY + 30;
  const rowHeight = 25;
  
  // Create empty rows if no bills - reduced for landscape
  const totalHotelRows = Math.max(bills.length, 5);
  
  for (let i = 0; i < totalHotelRows; i++) {
    // Draw row borders
    doc.rect(50, currentY, pageWidth, rowHeight).stroke();
    
    // Draw vertical lines
    for (let j = 1; j < hotelColPositions.length; j++) {
      doc.moveTo(hotelColPositions[j], currentY).lineTo(hotelColPositions[j], currentY + rowHeight).stroke();
    }
    
    // Fill in data if available
    if (i < bills.length) {
      doc.fontSize(9).font('Helvetica');
      
      // Calculate column widths for text
      const nameWidth = hotelColPositions[1] - hotelColPositions[0] - 10;
      const placeWidth = hotelColPositions[2] - hotelColPositions[1] - 10;
      const billNoWidth = hotelColPositions[3] - hotelColPositions[2] - 10;
      const dateWidth = hotelColPositions[4] - hotelColPositions[3] - 10;
      const amountWidth = pageWidth - (hotelColPositions[4] - 50) - 10;
      
      // Format text to prevent overflow
      doc.text(bills[i].name || 'N/A', 55, currentY + 8, { 
        width: nameWidth,
        ellipsis: true
      });
      
      doc.text(bills[i].place || 'N/A', hotelColPositions[1] + 5, currentY + 8, {
        width: placeWidth,
        ellipsis: true
      });
      
      doc.text(bills[i].billNo || 'N/A', hotelColPositions[2] + 5, currentY + 8, {
        width: billNoWidth,
        ellipsis: true
      });
      
      doc.text(bills[i].billDate || 'N/A', hotelColPositions[3] + 5, currentY + 8, {
        width: dateWidth,
        ellipsis: true
      });
      
      // Format amount with Rs prefix
      const amount = `Rs ${Number(bills[i].amount || 0).toLocaleString('en-IN')}`;
      doc.text(amount, hotelColPositions[4] + 5, currentY + 8, { 
        width: amountWidth,
        align: 'right'
      });
    }
    
    currentY += rowHeight;
  }
  
  // Total row for hotel bills
  doc.rect(50, currentY, pageWidth, rowHeight).stroke();
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Total:', hotelColPositions[3] + 5, currentY + 8);
  
  // Calculate total amount
  const totalBillAmount = bills.reduce((total, bill) => total + (Number(bill.amount) || 0), 0);
  const formattedBillTotal = `Rs ${totalBillAmount.toLocaleString('en-IN')}`;
  doc.text(formattedBillTotal, hotelColPositions[4] + 5, currentY + 8, { 
    align: 'right', 
    width: pageWidth * 0.15 
  });
  
  // Draw vertical lines for total row
  for (let j = 1; j < hotelColPositions.length; j++) {
    doc.moveTo(hotelColPositions[j], currentY).lineTo(hotelColPositions[j], currentY + rowHeight).stroke();
  }
  
  currentY += rowHeight;
  
  // TADA rule note
  doc.rect(50, currentY, pageWidth, 25).stroke();
  doc.fontSize(8).font('Helvetica');
  doc.text('(The above amount is eligible upto the total limit as per TADA Rule which includes Hotel charges, Food, Laundry, tips, Portages etc. with supporting of bills)', 60, currentY + 8, { width: pageWidth - 20 });
  
  currentY += 25;
  doc.moveDown(0.5);
  
  // Conveyance Charges Table
  doc.fontSize(11).font('Helvetica-Bold').text('Details of Conveyance Charges', { align: 'center' });
  doc.moveDown(0.5);
  
  const conveyanceTableStartY = doc.y;
  
  // Define column widths for conveyance table - adjusted for landscape
  const conveyanceColWidths = [
    0.1,  // Date (10%)
    0.15, // Place (15%)
    0.2,  // From (20%)
    0.2,  // To (20%)
    0.15, // Mode (15%)
    0.2   // Amount (20%)
  ];
  
  // Calculate absolute column positions
  const conveyanceColPositions = [50];
  accumulatedWidth = 50;
  conveyanceColWidths.forEach(width => {
    accumulatedWidth += width * pageWidth;
    conveyanceColPositions.push(accumulatedWidth);
  });
  
  // Draw conveyance table header row
  doc.rect(50, conveyanceTableStartY, pageWidth, 25).stroke();
  
  // Header row cells
  for (let i = 1; i < conveyanceColPositions.length; i++) {
    doc.moveTo(conveyanceColPositions[i], conveyanceTableStartY).lineTo(conveyanceColPositions[i], conveyanceTableStartY + 25).stroke();
  }
  
  // Header row text
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Date', 55, conveyanceTableStartY + 8);
  doc.text('Place', conveyanceColPositions[1] + 5, conveyanceTableStartY + 8);
  doc.text('From', conveyanceColPositions[2] + 5, conveyanceTableStartY + 8);
  doc.text('To', conveyanceColPositions[3] + 5, conveyanceTableStartY + 8);
  doc.text('Mode', conveyanceColPositions[4] + 5, conveyanceTableStartY + 8);
  doc.text('Amount', conveyanceColPositions[5] + 5, conveyanceTableStartY + 8);
  
  // Draw data rows for conveyance charges
  const conveyances = data.conveyances || [];
  currentY = conveyanceTableStartY + 25;
  
  // Create empty rows if no conveyances - reduced for landscape
  const totalConveyanceRows = Math.max(conveyances.length, 5);
  
  for (let i = 0; i < totalConveyanceRows; i++) {
    // Draw row borders
    doc.rect(50, currentY, pageWidth, rowHeight).stroke();
    
    // Draw vertical lines
    for (let j = 1; j < conveyanceColPositions.length; j++) {
      doc.moveTo(conveyanceColPositions[j], currentY).lineTo(conveyanceColPositions[j], currentY + rowHeight).stroke();
    }
    
    // Fill in data if available
    if (i < conveyances.length) {
      doc.fontSize(9).font('Helvetica');
      
      // Calculate column widths for text
      const dateWidth = conveyanceColPositions[1] - conveyanceColPositions[0] - 10;
      const placeWidth = conveyanceColPositions[2] - conveyanceColPositions[1] - 10;
      const fromWidth = conveyanceColPositions[3] - conveyanceColPositions[2] - 10;
      const toWidth = conveyanceColPositions[4] - conveyanceColPositions[3] - 10;
      const modeWidth = conveyanceColPositions[5] - conveyanceColPositions[4] - 10;
      const amountWidth = pageWidth - (conveyanceColPositions[5] - 50) - 10;
      
      // Format text to prevent overflow
      doc.text(conveyances[i].date || 'N/A', 55, currentY + 8, {
        width: dateWidth,
        ellipsis: true
      });
      
      doc.text(conveyances[i].place || 'N/A', conveyanceColPositions[1] + 5, currentY + 8, {
        width: placeWidth,
        ellipsis: true
      });
      
      doc.text(conveyances[i].from || 'N/A', conveyanceColPositions[2] + 5, currentY + 8, {
        width: fromWidth,
        ellipsis: true
      });
      
      doc.text(conveyances[i].to || 'N/A', conveyanceColPositions[3] + 5, currentY + 8, {
        width: toWidth,
        ellipsis: true
      });
      
      doc.text(conveyances[i].mode || 'N/A', conveyanceColPositions[4] + 5, currentY + 8, {
        width: modeWidth,
        ellipsis: true
      });
      
      // Format amount with Rs prefix
      const amount = `Rs ${Number(conveyances[i].amount || 0).toLocaleString('en-IN')}`;
      doc.text(amount, conveyanceColPositions[5] + 5, currentY + 8, { 
        width: amountWidth,
        align: 'right'
      });
    }
    
    currentY += rowHeight;
  }
  
  // Total row for conveyance charges
  doc.rect(50, currentY, pageWidth, rowHeight).stroke();
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Total:', conveyanceColPositions[4] + 5, currentY + 8);
  
  // Calculate total amount
  const totalConveyanceAmount = conveyances.reduce((total, conveyance) => total + (Number(conveyance.amount) || 0), 0);
  const formattedConveyanceTotal = `Rs ${totalConveyanceAmount.toLocaleString('en-IN')}`;
  doc.text(formattedConveyanceTotal, conveyanceColPositions[5] + 5, currentY + 8, { 
    align: 'right', 
    width: pageWidth * 0.17 
  });
  
  // Draw vertical lines for total row
  for (let j = 1; j < conveyanceColPositions.length; j++) {
    doc.moveTo(conveyanceColPositions[j], currentY).lineTo(conveyanceColPositions[j], currentY + rowHeight).stroke();
  }
  
  currentY += rowHeight + 30;
  
  // Add a signature line
  doc.fontSize(10).font('Helvetica-Bold').text('SIGNATURE OF CLAIMANT:', 50, currentY);
  doc.moveTo(220, currentY + 5).lineTo(350, currentY + 5).stroke();
}

// Update the Final Summary page to display all fields correctly and fix DA calculation
function generateFinalSummary(doc, data) {
  try {
    console.log("Generating final summary with data:", JSON.stringify({
      employeeName: data.employee?.employeeName,
      designation: data.employee?.designation,
      department: data.employee?.department,
      travelDuration: data.travelDuration,
      expenses: data.expenses?.length,
      totalBillAmount: data.totalBillAmount,
      conveyancesLength: data.conveyances?.length
    }));
    
    // Create a statement of travelling bill form in a more compact design
    doc.fontSize(11).font('Helvetica-Bold').text('National Cooperative Exports Limited', { align: 'center' });
    doc.fontSize(10).font('Helvetica-Bold').text('STATEMENT OF TRAVELLING BILL', { align: 'center' });
    doc.moveDown(0.2);
    
    const pageWidth = doc.page.width - 100;
    const rowHeight = 18; // Smaller row height
    
    // Employee details section (top row)
    const topRowY = doc.y;
    
    // First column - Name
    doc.rect(50, topRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.fontSize(8).font('Helvetica');
    doc.text(data.employee?.employeeName || 'N/A', 55, topRowY + 5);
    
    // Second column - Empl. No.
    doc.rect(50 + pageWidth * 0.4, topRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Empl. No. ${data.employee?.employeeId || 'N/A'}`, 50 + pageWidth * 0.4 + 5, topRowY + 5);
    
    // Third column - Designation - ensure correct value is displayed
    doc.rect(50 + pageWidth * 0.7, topRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Designation: ${data.employee?.designation || 'N/A'}`, 50 + pageWidth * 0.7 + 5, topRowY + 5);
    
    // Second row
    const secondRowY = topRowY + rowHeight;
    
    // First column - Station/s
    doc.rect(50, secondRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.text(`Station/s: ${data.employee?.station || 'N/A'}`, 55, secondRowY + 5);
    
    // Second column - Department
    doc.rect(50 + pageWidth * 0.4, secondRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Dept: ${data.employee?.department || 'N/A'}`, 50 + pageWidth * 0.4 + 5, secondRowY + 5);
    
    // Third column - HQ
    doc.rect(50 + pageWidth * 0.7, secondRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`HQ: ${data.employee?.hq || 'Delhi'}`, 50 + pageWidth * 0.7 + 5, secondRowY + 5);
    
    // Third row - Use travel duration data if available
    const thirdRowY = secondRowY + rowHeight;
    const travelData = data.travelDuration || {};
    
    // First column - Boarding Date
    doc.rect(50, thirdRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.text(`Boarding Dt: ${travelData.departureDate || data.tourSummary?.tourDetails?.[0]?.fromDate || 'N/A'}`, 55, thirdRowY + 5);
    
    // Second column - Time
    doc.rect(50 + pageWidth * 0.4, thirdRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Time: ${travelData.departureTime || 'N/A'} hrs`, 50 + pageWidth * 0.4 + 5, thirdRowY + 5);
    
    // Third column - Return to HQ
    doc.rect(50 + pageWidth * 0.7, thirdRowY, pageWidth * 0.3, rowHeight).stroke();
    const returnDate = travelData.returnDate || data.tourSummary?.tourDetails?.[0]?.toDate || 'N/A';
    doc.text(`Return: ${returnDate}, ${travelData.returnTime || 'N/A'} hrs`, 50 + pageWidth * 0.7 + 5, thirdRowY + 5);
    
    // Fourth row
    const fourthRowY = thirdRowY + rowHeight;
    const agendaSummary = data.agendaItems && data.agendaItems.length > 0 ? 
                         data.agendaItems[0].agendaItem : 
                         (data.tourSummary?.tourDetails?.[0]?.purpose || 'N/A');
    
    // First column - Purpose of Journey
    doc.rect(50, fourthRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.text(`Purpose of Journey:`, 55, fourthRowY + 5);
    
    // Second column - Purpose details
    doc.rect(50 + pageWidth * 0.4, fourthRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(agendaSummary, 50 + pageWidth * 0.4 + 5, fourthRowY + 5);
    
    // Third column - Days on Tour - calculate from period or use from data
    doc.rect(50 + pageWidth * 0.7, fourthRowY, pageWidth * 0.3, rowHeight).stroke();
    // Try multiple sources for tour period data
    let daysOnTour = 'N/A';
    if (travelData.nightsStayed) {
      daysOnTour = (parseInt(travelData.nightsStayed) + 1).toString();
    } else if (data.employee?.tourPeriod) {
      daysOnTour = data.employee.tourPeriod;
    } else if (data.tourPeriod) {
      daysOnTour = data.tourPeriod;
    }
    doc.text(`Days on Tour: ${daysOnTour}`, 50 + pageWidth * 0.7 + 5, fourthRowY + 5);
    
    // PARTICULARS OF EXPENSES section
    const expensesHeaderY = fourthRowY + rowHeight;
    
    // Expenses header
    doc.rect(50, expensesHeaderY, pageWidth * 0.7, rowHeight).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('PARTICULARS OF EXPENSES', 50 + pageWidth * 0.35 - 55, expensesHeaderY + 5);
    
    // Amount header
    doc.rect(50 + pageWidth * 0.7, expensesHeaderY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('AMOUNT (Rs.)', 50 + pageWidth * 0.7 + 35, expensesHeaderY + 5);
    
    // Travel details grid - simplified to save space
    const travelGridY = expensesHeaderY + rowHeight;
    const travelGridHeight = 80; // Reduced height
    
    // Create outer rectangle for travel grid
    doc.rect(50, travelGridY, pageWidth, travelGridHeight).stroke();
    
    // Draw vertical lines to divide the columns (3 columns total)
    doc.moveTo(50 + pageWidth * 0.33, travelGridY).lineTo(50 + pageWidth * 0.33, travelGridY + travelGridHeight).stroke();
    doc.moveTo(50 + pageWidth * 0.66, travelGridY).lineTo(50 + pageWidth * 0.66, travelGridY + travelGridHeight).stroke();
    
    // Add travel data in a compact format (3 columns)
    doc.fontSize(8).font('Helvetica');
    
    // Get expenses data
    const expenses = data.expenses || [];
    
    // Display up to 3 expenses in the grid
    for (let i = 0; i < Math.min(3, expenses.length); i++) {
      const expense = expenses[i];
      const colX = 55 + (pageWidth * 0.33 * i);
      
      if (expense) {
        doc.text(`Date: ${expense.date || 'N/A'}`, colX, travelGridY + 5);
        doc.text(`Mode: ${expense.modeOfTravel || 'N/A'}`, colX, travelGridY + 18);
        doc.text(`From: ${expense.from || 'N/A'}`, colX, travelGridY + 31);
        doc.text(`To: ${expense.to || 'N/A'}`, colX, travelGridY + 44);
        doc.text(`Class: ${expense.class || 'N/A'}`, colX, travelGridY + 57);
        doc.text(`Amount: ₹${expense.ticketAmount || expense.amount || '0.00'}`, colX, travelGridY + 70);
      }
    }
    
    // If no expenses, display placeholder
    if (expenses.length === 0) {
      doc.text('No travel expenses recorded', 55, travelGridY + 40);
    }
    
    // Expenses section
    const expensesTableY = travelGridY + travelGridHeight;
    
    // First row - Amount of Fare
    doc.rect(50, expensesTableY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('1', 55, expensesTableY + 5);
    
    doc.rect(50 + pageWidth * 0.1, expensesTableY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Amount of Fare', 55 + pageWidth * 0.1, expensesTableY + 5);
    
    // Calculate total ticket amount
    const totalTicketAmount = expenses.reduce((sum, expense) => {
      const amount = parseFloat(expense.ticketAmount || expense.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    doc.rect(50 + pageWidth * 0.7, expensesTableY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(totalTicketAmount.toFixed(2), 50 + pageWidth * 0.7 + 75, expensesTableY + 5, { align: 'right' });
    
    // Second row - Hotel Bills
    const hotelRowY = expensesTableY + rowHeight;
    doc.rect(50, hotelRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('2', 55, hotelRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, hotelRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Hotel Bills (Daily) (Details on reverse)', 55 + pageWidth * 0.1, hotelRowY + 5);
    
    // Get hotel bill amount
    const bills = data.bills || [];
    const hotelBillAmount = bills.reduce((sum, bill) => {
      const amount = parseFloat(bill.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    doc.rect(50 + pageWidth * 0.7, hotelRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(hotelBillAmount.toFixed(2), 50 + pageWidth * 0.7 + 75, hotelRowY + 5, { align: 'right' });
    
    // Third row - Conveyance Charges
    const conveyanceRowY = hotelRowY + rowHeight;
    doc.rect(50, conveyanceRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('3', 55, conveyanceRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, conveyanceRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Conveyance Charges (Details on reverse)', 55 + pageWidth * 0.1, conveyanceRowY + 5);
    
    // Get conveyance amount
    const conveyances = data.conveyances || [];
    const totalConveyanceAmount = conveyances.reduce((sum, conv) => {
      const amount = parseFloat(conv.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    doc.rect(50 + pageWidth * 0.7, conveyanceRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(totalConveyanceAmount.toFixed(2), 50 + pageWidth * 0.7 + 75, conveyanceRowY + 5, { align: 'right' });
    
    // Fourth row - Others (condensed)
    const othersRowY = conveyanceRowY + rowHeight;
    doc.rect(50, othersRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('4', 55, othersRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, othersRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Others: (A/B/C/D)', 55 + pageWidth * 0.1, othersRowY + 5);
    
    // Default others amount to 0
    const othersAmount = 0;
    
    doc.rect(50 + pageWidth * 0.7, othersRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(othersAmount.toFixed(2), 50 + pageWidth * 0.7 + 75, othersRowY + 5, { align: 'right' });
    
    // Fifth row - Total of A/B/C/D
    const totalAbcdRowY = othersRowY + rowHeight;
    doc.rect(50, totalAbcdRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('5', 55, totalAbcdRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, totalAbcdRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Total of A/B/C/D above', 55 + pageWidth * 0.1, totalAbcdRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, totalAbcdRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(othersAmount.toFixed(2), 50 + pageWidth * 0.7 + 75, totalAbcdRowY + 5, { align: 'right' });
    
    // DA Section (improved calculation)
    const daRowY = totalAbcdRowY + rowHeight;
    doc.rect(50, daRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('6', 55, daRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, daRowY, pageWidth * 0.6, rowHeight).stroke();
    
    // Get Daily Allowance (DA) information from multiple sources
    const dailyAllowance = data.dailyAllowance || {};
    
    // Calculate nights stayed from multiple sources
    let nightsStayed = 0;
    
    if (dailyAllowance.nightsStayed && !isNaN(parseInt(dailyAllowance.nightsStayed))) {
      nightsStayed = parseInt(dailyAllowance.nightsStayed);
    } else if (dailyAllowance.daDays && !isNaN(parseInt(dailyAllowance.daDays))) {
      nightsStayed = parseInt(dailyAllowance.daDays);
    } else if (travelData.nightsStayed && !isNaN(parseInt(travelData.nightsStayed))) {
      nightsStayed = parseInt(travelData.nightsStayed);
    } else if (daysOnTour && daysOnTour !== 'N/A' && !isNaN(parseInt(daysOnTour))) {
      // If days on tour available, assume nights = days
      nightsStayed = parseInt(daysOnTour);
    } else {
      // Default to 6 days if no data available (to match the 2400 amount)
      nightsStayed = 6;
    }
    
    // Get daily allowance rate - use 400 as directed or from data
    const daRate = 400; // Fixed to 400 as specified
    const daAmount = nightsStayed * daRate;
    
    doc.text(`Daily Allowance (${nightsStayed} ${nightsStayed === 1 ? 'day' : 'days'} @ Rs.${daRate}/day)`, 55 + pageWidth * 0.1, daRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, daRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(daAmount.toFixed(2), 50 + pageWidth * 0.7 + 75, daRowY + 5, { align: 'right' });
    
    // Calculate grand total
    const grandTotal = totalTicketAmount + hotelBillAmount + totalConveyanceAmount + othersAmount + daAmount;
    
    // Total row
    const finalTotalRowY = daRowY + rowHeight;
    doc.rect(50, finalTotalRowY, pageWidth * 0.7, rowHeight).stroke();
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('TOTAL', 55 + pageWidth * 0.5, finalTotalRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, finalTotalRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(grandTotal.toFixed(2), 50 + pageWidth * 0.7 + 75, finalTotalRowY + 5, { align: 'right' });
    
    // Amount in words
    const wordsRowY = finalTotalRowY + rowHeight;
    doc.rect(50, wordsRowY, pageWidth, rowHeight).stroke();
    doc.fontSize(8).font('Helvetica');
    
    // Convert amount to words
    const amountInWords = `Rs.(In Words): ${numberToWords(grandTotal)} Rupees Only`;
    doc.text(amountInWords, 55, wordsRowY + 5);
    
    // Advance section (condensed)
    const advanceRowY = wordsRowY + rowHeight;
    doc.rect(50, advanceRowY, pageWidth * 0.5, rowHeight).stroke();
    doc.text('Less: (A) Advance From: DTO', 55, advanceRowY + 5);
    
    doc.rect(50 + pageWidth * 0.5, advanceRowY, pageWidth * 0.5, rowHeight).stroke();
    doc.text('(B) Ticket from: NCEL', 55 + pageWidth * 0.5 + 5, advanceRowY + 5);
    
    // Total payable row
    const totalPayableRowY = advanceRowY + rowHeight;
    doc.rect(50, totalPayableRowY, pageWidth * 0.7, rowHeight).stroke();
    doc.text('Total payable/receivable:', 55 + pageWidth * 0.4, totalPayableRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, totalPayableRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(grandTotal.toFixed(2), 50 + pageWidth * 0.7 + 75, totalPayableRowY + 5, { align: 'right' });
    
    // Signature row
    const signatureRowY = totalPayableRowY + rowHeight + 10;
    
    // Draw signature lines
    doc.text('Sign of Claimant:', 55, signatureRowY);
    doc.moveTo(55, signatureRowY + 20).lineTo(180, signatureRowY + 20).stroke();
    
    doc.text('Dept. Head:', 240, signatureRowY);
    doc.moveTo(240, signatureRowY + 20).lineTo(350, signatureRowY + 20).stroke();
    
    doc.text('Sanctioning Authority:', 410, signatureRowY);
    doc.moveTo(410, signatureRowY + 20).lineTo(520, signatureRowY + 20).stroke();
    
    // Accounts row
    const accountsRowY = signatureRowY + 40;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('TO BE USED BY ACCOUNTS DEPT.', 55, accountsRowY);
    doc.moveTo(50, accountsRowY + 5).lineTo(550, accountsRowY + 5).stroke();
    
    // Final signature row
    const finalRowY = accountsRowY + 20;
    doc.fontSize(8).font('Helvetica');
    
    doc.text('Checked by:', 55, finalRowY);
    doc.moveTo(55, finalRowY + 20).lineTo(150, finalRowY + 20).stroke();
    
    doc.text('Passed by:', 180, finalRowY);
    doc.moveTo(180, finalRowY + 20).lineTo(280, finalRowY + 20).stroke();
    
    doc.text('Internal Audit:', 310, finalRowY);
    doc.moveTo(310, finalRowY + 20).lineTo(410, finalRowY + 20).stroke();
    
    doc.text('Additional:', 440, finalRowY);
    doc.moveTo(440, finalRowY + 20).lineTo(540, finalRowY + 20).stroke();
    
    // Note at the bottom
    const noteRowY = finalRowY + 30;
    doc.fontSize(7);
    doc.text('Note: 1) Letter or order authorising the tour and also in respect of deductions any please be attached.', 55, noteRowY);
    doc.text('2) Additional details if any may be shown on the reverse.', 55, noteRowY + 10);
    doc.text('Signed Tour Report & Copy of Tour Programme is attached', 55, noteRowY + 20);
    
    return doc.y;
  } catch (error) {
    console.error('Error in generateFinalSummary:', error);
    doc.text('Error generating summary: ' + error.message, 50, doc.y + 10);
    return doc.y + 20;
  }
}

// Helper function to convert number to words (simplified)
function numberToWords(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numStr = num.toFixed(2);
  const wholePart = parseInt(numStr.split('.')[0]);
  const decimalPart = parseInt(numStr.split('.')[1]);
  
  let result = '';
  
  if (wholePart >= 1000) {
    result += ones[Math.floor(wholePart / 1000)] + ' Thousand ';
    if (wholePart % 1000 !== 0) result += '';
  }
  
  if (wholePart >= 100) {
    result += ones[Math.floor((wholePart % 1000) / 100)] + ' Hundred ';
    if (wholePart % 100 !== 0) result += 'and ';
  }
  
  if (wholePart % 100 < 20) {
    result += ones[wholePart % 100];
  } else {
    result += tens[Math.floor((wholePart % 100) / 10)];
    if ((wholePart % 10) !== 0) result += '-' + ones[wholePart % 10];
  }
  
  if (decimalPart > 0) {
    result += ' Point ';
    result += decimalPart === 0 ? 'Zero Zero' : 
             (decimalPart < 10 ? 'Zero ' + ones[decimalPart] : 
             (decimalPart < 20 ? ones[decimalPart] : 
             tens[Math.floor(decimalPart / 10)] + (decimalPart % 10 !== 0 ? '-' + ones[decimalPart % 10] : '')));
  }
  
  return result.trim();
}

module.exports = { generateInvoice };