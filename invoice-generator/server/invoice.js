const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateInvoice(data) {
  return new Promise((resolve, reject) => {
    try {
      // Validate input data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid invoice data provided');
      }

      console.log('Creating PDF document with data:', JSON.stringify({
        hasEmployee: !!data.employee,
        employeeName: data.employee?.employeeName,
        hasTourSummary: !!data.tourSummary,
        tourDetailsCount: data.tourSummary?.tourDetails?.length || 0,
        billsCount: data.bills?.length || 0,
        expensesCount: data.expenses?.length || 0,
        agendaItemsCount: data.agendaItems?.length || 0
      }));

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
        // Generate pages only if there's relevant data
        
        // Page 1: Basic Details (only if agendaItems exist)
        if (data.agendaItems && data.agendaItems.length > 0) {
          generateBasicDetailsPage(doc, data);
        }
        
        // Page 2: Tour Programme (only if tourSummary exists)
        if (data.tourSummary && data.tourSummary.tourDetails && data.tourSummary.tourDetails.length > 0) {
          doc.addPage();
          generateTourSummaryTable(doc, data, drawTableLine, drawTableBorders);
        }

        // Page 3: Bill & Conveyance (only if bills or conveyances exist)
        if ((data.bills && data.bills.length > 0) || (data.conveyances && data.conveyances.length > 0)) {
          doc.addPage();
          generateBillDetailsTable(doc, data, drawTableLine, drawTableBorders);
        }

        // Page 4: Final Summary (Travel Bill)
        if (data.expenses && data.expenses.length > 0) {
          doc.addPage();
          generateFinalSummary(doc, data);
        }

        // Add bill attachments only if they have valid file URLs
        if (data.bills && Array.isArray(data.bills)) {
          const validBills = data.bills.filter(bill => bill.fileUrl && bill.fileUrl.trim() !== '');
          if (validBills.length > 0) {
            doc.addPage();
            generateBillAttachments(doc, validBills);
          }
        }

        // Add expense attachments only if they have valid file URLs 
        if (data.expenses && Array.isArray(data.expenses)) {
          const validExpenses = data.expenses.filter(expense => expense.fileUrl && expense.fileUrl.trim() !== '');
          if (validExpenses.length > 0) {
            doc.addPage();
            generateExpenseAttachments(doc, validExpenses);
          }
        }

        // Add conveyance attachments only if they have valid file URLs
        if (data.conveyances && Array.isArray(data.conveyances)) {
          const validConveyances = data.conveyances.filter(conv => conv.fileUrl && conv.fileUrl.trim() !== '');
          if (validConveyances.length > 0) {
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

// Function to generate Basic Details page
function generateBasicDetailsPage(doc, data) {
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
  
  // Get agenda items directly from data.agendaItems and ensure it's always an array
  let agendaItems = [];
  if (Array.isArray(data.agendaItems)) {
    agendaItems = data.agendaItems;
  } else if (data.employee && Array.isArray(data.employee.agendaItems)) {
    // Try to get agenda items from employee object if they're not directly in data
    agendaItems = data.employee.agendaItems;
  }
  
  // Debug the agenda items to see what's available
  console.log('Agenda items to render (detailed):', JSON.stringify(agendaItems, null, 2));
  console.log('Number of agenda items:', agendaItems.length);
  console.log('Data structure:', JSON.stringify(Object.keys(data), null, 2));
  
  // Create table borders
  doc.rect(50, startY, tableWidth, 30).stroke(); // Header row

  // Draw rows for each agenda item with proper spacing
  let rowY = startY + 30; // Start right after header
  const rowHeight = 40;
  
  if (agendaItems && agendaItems.length > 0) {
    // Loop through agenda items
    agendaItems.forEach((item, index) => {
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
      
      // Agenda Item
      const agendaItem = item.agendaItem || 'N/A';
      doc.text(agendaItem, colX + 5, textY, { 
        width: actualColWidths[1] - 10,
        ellipsis: true
      });
      colX += actualColWidths[1];
      
      // From Date
      const fromDate = item.fromDate ? new Date(item.fromDate).toLocaleDateString() : 'N/A';
      doc.text(fromDate, colX + 5, textY, {
        width: actualColWidths[2] - 10,
        align: 'center'
      });
      colX += actualColWidths[2];
      
      // To Date
      const toDate = item.toDate ? new Date(item.toDate).toLocaleDateString() : 'N/A';
      doc.text(toDate, colX + 5, textY, {
        width: actualColWidths[3] - 10,
        align: 'center'
      });
      colX += actualColWidths[3];
      
      // Record note of Action taken
      const actionTaken = item.actionTaken || 'N/A';
      doc.text(actionTaken, colX + 5, textY, {
        width: actualColWidths[4] - 10,
        ellipsis: true
      });
      
      // Move to next row
      rowY += rowHeight;
    });
  } else {
    // No agenda items message
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

// Function to generate bill attachments in a more efficient way
function generateBillAttachments(doc, bills) {
  doc.fontSize(16).font('Helvetica-Bold').text('Bill Attachments', { align: 'center' });
  doc.moveDown(0.5);
  
  let currentY = doc.y;
  const pageHeight = doc.page.height - 100;
  const imageMaxHeight = 200;
  
  for (const bill of bills) {
    if (bill.fileUrl) {
      try {
        // Check if we need to add a new page
        if (currentY + imageMaxHeight + 50 > pageHeight) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`Bill No: ${bill.billNo || 'N/A'} | Amount: Rs ${Number(bill.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
        currentY = doc.y + 10;
        
        // Find image path
        let imagePath = findImagePath(bill.fileUrl);
        
        if (imagePath) {
          doc.image(imagePath, {
            fit: [400, imageMaxHeight],
            align: 'center'
          });
          doc.moveDown();
        } else {
          doc.text('Bill file not found. Please check the file path.', { align: 'center' });
        }
        
        currentY = doc.y + 20;
      } catch (error) {
        console.error('Error processing bill attachment:', error);
        doc.text('Error processing bill attachment: ' + error.message, { align: 'center' });
        currentY = doc.y + 10;
      }
    }
  }
}

// Function to generate expense attachments in a more efficient way
function generateExpenseAttachments(doc, expenses) {
  doc.fontSize(16).font('Helvetica-Bold').text('Travel Ticket Attachments', { align: 'center' });
  doc.moveDown(0.5);
  
  let currentY = doc.y;
  const pageHeight = doc.page.height - 100;
  const imageMaxHeight = 200;
  
  for (const expense of expenses) {
    if (expense.fileUrl) {
      try {
        // Check if we need to add a new page
        if (currentY + imageMaxHeight + 50 > pageHeight) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`From: ${expense.from || 'N/A'} To: ${expense.to || 'N/A'} | Amount: Rs ${Number(expense.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
        currentY = doc.y + 10;
        
        // Find image path
        let imagePath = findImagePath(expense.fileUrl);
        
        if (imagePath) {
          doc.image(imagePath, {
            fit: [400, imageMaxHeight],
            align: 'center'
          });
          doc.moveDown();
        } else {
          doc.text('Ticket file not found. Please check the file path.', { align: 'center' });
        }
        
        currentY = doc.y + 20;
      } catch (error) {
        console.error('Error processing ticket attachment:', error);
        doc.text('Error processing ticket attachment: ' + error.message, { align: 'center' });
        currentY = doc.y + 10;
      }
    }
  }
}

// Function to generate conveyance attachments in a more efficient way
function generateConveyanceAttachments(doc, conveyances) {
  doc.fontSize(16).font('Helvetica-Bold').text('Conveyance Receipt Attachments', { align: 'center' });
  doc.moveDown(0.5);
  
  let currentY = doc.y;
  const pageHeight = doc.page.height - 100;
  const imageMaxHeight = 200;
  
  for (const conveyance of conveyances) {
    if (conveyance.fileUrl) {
      try {
        // Check if we need to add a new page
        if (currentY + imageMaxHeight + 50 > pageHeight) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`Place: ${conveyance.place || 'N/A'} | Amount: Rs ${Number(conveyance.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
        currentY = doc.y + 10;
        
        // Find image path
        let imagePath = findImagePath(conveyance.fileUrl);
        
        if (imagePath) {
          doc.image(imagePath, {
            fit: [400, imageMaxHeight],
            align: 'center'
          });
          doc.moveDown();
        } else {
          doc.text('Receipt file not found. Please check the file path.', { align: 'center' });
        }
        
        currentY = doc.y + 20;
      } catch (error) {
        console.error('Error processing conveyance attachment:', error);
        doc.text('Error processing conveyance attachment: ' + error.message, { align: 'center' });
        currentY = doc.y + 10;
      }
    }
  }
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
  
  // Designation field (full width)
  doc.rect(50 + pageWidth * 0.6, headerRow2Y, pageWidth * 0.4, 25).stroke();
  doc.text(`Designation:`, 50 + pageWidth * 0.6 + 5, headerRow2Y + 7);
  
  // Third row: HQ (was previously sharing space with Designation)
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
  
  doc.text('Contact Address', currentX + 5, tableStartY + 10);
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
        // Contact
        doc.text(detail.contactInfo || '', colX + 5, y, {
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
  doc.text('Rs', 425, returnTicketY + 7);
  
  // Local Transport Request
  const localTransportY = returnTicketY + 25;
  doc.rect(50 + pageWidth * 0.6, localTransportY, pageWidth * 0.4, 25).stroke();
  doc.font('Helvetica-Bold').text('Local Transport Request :', 50 + pageWidth * 0.6 + 5, localTransportY + 7);
  
  // Lodging
  doc.rect(50, localTransportY, pageWidth * 0.6, 25).stroke();
  doc.font('Helvetica').text('Lodging', 55, localTransportY + 7);
  doc.text(':', 200, localTransportY + 7);
  doc.text('Rs', 425, localTransportY + 7);
  
  // Additional Information
  const additionalInfoY = localTransportY + 25;
  doc.rect(50 + pageWidth * 0.6, additionalInfoY, pageWidth * 0.4, 25).stroke();
  doc.font('Helvetica').text('Additional Information :', 50 + pageWidth * 0.6 + 5, additionalInfoY + 7);
  
  // Local Conveyance
  doc.rect(50, additionalInfoY, pageWidth * 0.6, 25).stroke();
  doc.text('Local Conveyance', 55, additionalInfoY + 7);
  doc.text(':', 200, additionalInfoY + 7);
  doc.text('Rs', 425, additionalInfoY + 7);
  
  // Blank space for Additional Info
  const blankSpaceY = additionalInfoY + 25;
  doc.rect(50 + pageWidth * 0.6, blankSpaceY, pageWidth * 0.4, 25).stroke();
  
  // Others
  doc.rect(50, blankSpaceY, pageWidth * 0.6, 25).stroke();
  doc.text('Others', 55, blankSpaceY + 7);
  doc.text(':', 200, blankSpaceY + 7);
  doc.text('Rs', 425, blankSpaceY + 7);
  
  // Total
  const totalY = blankSpaceY + 25;
  doc.rect(50, totalY, pageWidth * 0.6, 25).stroke();
  doc.text('Total', 55, totalY + 7);
  doc.text(':', 200, totalY + 7);
  doc.text('Rs', 425, totalY + 7);
  
  // Signature section
  const signatureY = totalY + 25;
  
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

function generateFinalSummary(doc, data) {
  try {
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
    doc.text(data.employee?.employeeName || 'Prateek Verma', 55, topRowY + 5);
    
    // Second column - Empl. No.
    doc.rect(50 + pageWidth * 0.4, topRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Empl. No. NCEL-01`, 50 + pageWidth * 0.4 + 5, topRowY + 5);
    
    // Third column - Designation
    doc.rect(50 + pageWidth * 0.7, topRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Designation: Data Analyst`, 50 + pageWidth * 0.7 + 5, topRowY + 5);
    
    // Second row
    const secondRowY = topRowY + rowHeight;
    
    // First column - Station/s
    doc.rect(50, secondRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.text(`Station/s: Chandigarh`, 55, secondRowY + 5);
    
    // Second column - Department
    doc.rect(50 + pageWidth * 0.4, secondRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Dept: ACCOUNTS`, 50 + pageWidth * 0.4 + 5, secondRowY + 5);
    
    // Third column - HQ
    doc.rect(50 + pageWidth * 0.7, secondRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`HQ: Delhi`, 50 + pageWidth * 0.7 + 5, secondRowY + 5);
    
    // Third row
    const thirdRowY = secondRowY + rowHeight;
    
    // First column - Boarding Date
    doc.rect(50, thirdRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.text(`Boarding Dt: 20.03.2025`, 55, thirdRowY + 5);
    
    // Second column - Time
    doc.rect(50 + pageWidth * 0.4, thirdRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Time: 1700 hrs`, 50 + pageWidth * 0.4 + 5, thirdRowY + 5);
    
    // Third column - Return to HQ
    doc.rect(50 + pageWidth * 0.7, thirdRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Return: 21/03/2025, 2100 hrs`, 50 + pageWidth * 0.7 + 5, thirdRowY + 5);
    
    // Fourth row
    const fourthRowY = thirdRowY + rowHeight;
    
    // First column - Purpose of Journey
    doc.rect(50, fourthRowY, pageWidth * 0.4, rowHeight).stroke();
    doc.text(`Purpose of Journey:`, 55, fourthRowY + 5);
    
    // Second column - Purpose details
    doc.rect(50 + pageWidth * 0.4, fourthRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('Vendor Meet', 50 + pageWidth * 0.4 + 5, fourthRowY + 5);
    
    // Third column - Days on Tour
    doc.rect(50 + pageWidth * 0.7, fourthRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text(`Days on Tour: 1`, 50 + pageWidth * 0.7 + 5, fourthRowY + 5);
    
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
    
    // Column 1
    doc.text('Date: 20/03/2025', 55, travelGridY + 5);
    doc.text('Mode: Air', 55, travelGridY + 18);
    doc.text('From: Delhi', 55, travelGridY + 31);
    doc.text('To: Chandigarh', 55, travelGridY + 44);
    doc.text('Dep: 1700 Hrs', 55, travelGridY + 57);
    doc.text('Arr: 2300 hrs', 55, travelGridY + 70);
    
    // Column 2
    doc.text('Date: 21/03/2025', 55 + pageWidth * 0.33 + 5, travelGridY + 5);
    doc.text('Mode: Air', 55 + pageWidth * 0.33 + 5, travelGridY + 18);
    doc.text('From: Chandigarh', 55 + pageWidth * 0.33 + 5, travelGridY + 31);
    doc.text('To: Delhi', 55 + pageWidth * 0.33 + 5, travelGridY + 44);
    doc.text('Dep: 1400 hrs', 55 + pageWidth * 0.33 + 5, travelGridY + 57);
    doc.text('Arr: 2100 hrs', 55 + pageWidth * 0.33 + 5, travelGridY + 70);
    
    // Column 3 - can be left blank or used for additional travel details if needed
    
    // Expenses section
    const expensesTableY = travelGridY + travelGridHeight;
    
    // First row - Amount of Fare
    doc.rect(50, expensesTableY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('1', 55, expensesTableY + 5);
    
    doc.rect(50 + pageWidth * 0.1, expensesTableY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Amount of Fare', 55 + pageWidth * 0.1, expensesTableY + 5);
    
    doc.rect(50 + pageWidth * 0.7, expensesTableY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('0.00', 50 + pageWidth * 0.7 + 75, expensesTableY + 5, { align: 'right' });
    
    // Second row - Hotel Bills
    const hotelRowY = expensesTableY + rowHeight;
    doc.rect(50, hotelRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('2', 55, hotelRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, hotelRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Hotel Bills Bill (Daily) (Details on reverse)', 55 + pageWidth * 0.1, hotelRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, hotelRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('2141.00', 50 + pageWidth * 0.7 + 75, hotelRowY + 5, { align: 'right' });
    
    // Third row - Conveyance Charges
    const conveyanceRowY = hotelRowY + rowHeight;
    doc.rect(50, conveyanceRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('3', 55, conveyanceRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, conveyanceRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Conveyance Charges (Details on reverse)', 55 + pageWidth * 0.1, conveyanceRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, conveyanceRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('0.00', 50 + pageWidth * 0.7 + 75, conveyanceRowY + 5, { align: 'right' });
    
    // Fourth row - Others (condensed)
    const othersRowY = conveyanceRowY + rowHeight;
    doc.rect(50, othersRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('4', 55, othersRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, othersRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Others: (A/B/C/D)', 55 + pageWidth * 0.1, othersRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, othersRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('0.00', 50 + pageWidth * 0.7 + 75, othersRowY + 5, { align: 'right' });
    
    // Fifth row - Total of A/B/C/D
    const totalAbcdRowY = othersRowY + rowHeight;
    doc.rect(50, totalAbcdRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('5', 55, totalAbcdRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, totalAbcdRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Total of A/B/C/D above', 55 + pageWidth * 0.1, totalAbcdRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, totalAbcdRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('0.00', 50 + pageWidth * 0.7 + 75, totalAbcdRowY + 5, { align: 'right' });
    
    // DA Section (condensed into one row)
    const daRowY = totalAbcdRowY + rowHeight;
    doc.rect(50, daRowY, pageWidth * 0.1, rowHeight).stroke();
    doc.text('6', 55, daRowY + 5);
    
    doc.rect(50 + pageWidth * 0.1, daRowY, pageWidth * 0.6, rowHeight).stroke();
    doc.text('Daily Allowance (1 day @ Rs.400/day)', 55 + pageWidth * 0.1, daRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, daRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('400.00', 50 + pageWidth * 0.7 + 75, daRowY + 5, { align: 'right' });
    
    // Total row
    const finalTotalRowY = daRowY + rowHeight;
    doc.rect(50, finalTotalRowY, pageWidth * 0.7, rowHeight).stroke();
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('TOTAL', 55 + pageWidth * 0.5, finalTotalRowY + 5);
    
    doc.rect(50 + pageWidth * 0.7, finalTotalRowY, pageWidth * 0.3, rowHeight).stroke();
    doc.text('2,541.00', 50 + pageWidth * 0.7 + 75, finalTotalRowY + 5, { align: 'right' });
    
    // Amount in words
    const wordsRowY = finalTotalRowY + rowHeight;
    doc.rect(50, wordsRowY, pageWidth, rowHeight).stroke();
    doc.fontSize(8).font('Helvetica');
    doc.text('Rs.(In Words): Two Thousand Five Hundred Forty-One Rupees', 55, wordsRowY + 5);
    
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
    doc.text('2,541.00', 50 + pageWidth * 0.7 + 75, totalPayableRowY + 5, { align: 'right' });
    
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

module.exports = { generateInvoice };