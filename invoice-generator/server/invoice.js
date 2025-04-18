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
        expensesCount: data.expenses?.length || 0
      }));

      const doc = new PDFDocument({ 
        size: 'A4', 
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
        // Page 1: Basic Details
        doc.fontSize(24).font('Helvetica-Bold').text('National Cooperation Export Limited', { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).text('Statement of Travelling Bill', { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', { underline: true });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica');
        doc.text(`Name: ${data.employee?.employeeName || 'N/A'}`);
        doc.text(`Department: ${data.employee?.department || 'N/A'}`);
        
        // Get destination from tour summary data - use the 'to' field from first tour detail
        const destination = data.tourSummary?.tourDetails?.[0]?.to || 'N/A';
        doc.text(`Destination: ${destination}`);
        
        // Get purpose from first agenda item's description
        const purpose = data.agendaItems?.[0]?.agendaItem || 'N/A';
        doc.text(`Purpose: ${purpose}`);
        
        // Use proper date fields based on tour summary data
        const fromDate = data.tourSummary?.tourDetails?.[0]?.fromDate || 'N/A';
        const toDate = data.tourSummary?.tourDetails?.[0]?.toDate || 'N/A';
        doc.text(`From Date: ${fromDate}`);
        doc.text(`To Date: ${toDate}`);

        // Force new page for Tour Summary
        doc.addPage();
        doc.fontSize(20).font('Helvetica-Bold').text('Tour Summary', { align: 'center' });
        doc.moveDown(2);
        generateTourSummaryTable(doc, data, drawTableLine, drawTableBorders);

        // Force new page for Bill Details
        doc.addPage();
        doc.fontSize(20).font('Helvetica-Bold').text('Bill Details', { align: 'center' });
        doc.moveDown(2);
        generateBillDetailsTable(doc, data, drawTableLine, drawTableBorders);

        // Force new page for Conveyance Details
        doc.addPage();
        doc.fontSize(20).font('Helvetica-Bold').text('Conveyance Details', { align: 'center' });
        doc.moveDown(2);
        generateConveyanceTable(doc, data, drawTableLine, drawTableBorders);

        // Force new page for Journey Statement
        doc.addPage();
        doc.fontSize(20).font('Helvetica-Bold').text('Statement of Journey', { align: 'center' });
        doc.moveDown(2);
        generateJourneyStatement(doc, data, drawTableLine, drawTableBorders);

        // Force new page for Final Summary
        doc.addPage();
        doc.fontSize(20).font('Helvetica-Bold').text('Final Summary', { align: 'center' });
        doc.moveDown(2);
        generateFinalSummary(doc, data);

        // Bill Attachments on separate pages
        if (data.bills && Array.isArray(data.bills) && data.bills.length > 0) {
          console.log('Processing bills for attachments, count:', data.bills.length);
          
          for (const bill of data.bills) {
            if (bill.fileUrl) {
              console.log('Processing bill with fileUrl:', bill.fileUrl);
              
              try {
                doc.addPage();
                doc.fontSize(16).font('Helvetica-Bold').text('Bill Attachment', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).font('Helvetica');
                doc.text(`Bill No: ${bill.billNo || 'N/A'}`, { align: 'center' });
                doc.text(`Amount: ₹${Number(bill.amount || 0).toLocaleString('en-IN')}`, { align: 'center' });
                doc.moveDown(2);
                
                // Attempt to load the image using multiple path formats
                let imagePath = bill.fileUrl;
                const possiblePaths = [
                  bill.fileUrl,  // Original path
                  path.resolve(bill.fileUrl),  // Absolute path
                  path.join(__dirname, bill.fileUrl), // Relative to script
                  path.join(__dirname, '..', bill.fileUrl), // Relative to server root
                  path.join(__dirname, 'uploads', path.basename(bill.fileUrl)), // In server/uploads
                  path.join(__dirname, '..', 'uploads', path.basename(bill.fileUrl)), // In project/uploads
                  path.join(__dirname, '..', 'client', 'public', path.basename(bill.fileUrl)) // In client/public
                ];
                
                console.log('Attempting to find image at these locations:');
                let imageFound = false;
                
                for (const testPath of possiblePaths) {
                  try {
                    console.log('Checking path:', testPath);
                    if (fs.existsSync(testPath)) {
                      console.log('Image found at:', testPath);
                      imagePath = testPath;
                      imageFound = true;
                      break;
                    }
                  } catch (fsError) {
                    console.error(`Error checking path ${testPath}:`, fsError.message);
                    // Continue checking other paths
                  }
                }
                
                if (imageFound) {
                  try {
                    console.log('Adding image to PDF from:', imagePath);
                    doc.image(imagePath, {
                      fit: [500, 650],
                      align: 'center'
                    });
                    console.log('Image added successfully');
                  } catch (imgError) {
                    console.error('Error adding image to PDF:', imgError);
                    doc.text(`Error loading bill image: ${imgError.message}`, { align: 'center' });
                    // Still continue with the PDF generation
                  }
                } else {
                  console.error('Bill file not found at any of the attempted paths for:', bill.fileUrl);
                  doc.text('Bill file not found. Please check the file path.', { align: 'center' });
                  doc.moveDown();
                  doc.text(`Attempted to load from: ${bill.fileUrl}`, { align: 'center' });
                }
              } catch (error) {
                console.error('Error processing bill attachment:', error);
                doc.text('Error processing bill attachment: ' + error.message, { align: 'center' });
              }
            }
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

function generateTourSummaryTable(doc, data, drawTableLine, drawTableBorders) {
  const tourDetails = data.tourSummary?.tourDetails || [];
  const startY = doc.y + 20;
  const endY = startY + ((tourDetails.length || 1) * 30) + 30;
  
  // Draw table with borders
  drawTableBorders(doc, startY, endY, 5);
  
  // Headers
  doc.fontSize(10).font('Helvetica-Bold');
  ['Date', 'Mode', 'From', 'To', 'Purpose'].forEach((header, i) => {
    const x = 50 + (i * ((doc.page.width - 100) / 5));
    doc.text(header, x + 5, startY + 5, { width: ((doc.page.width - 100) / 5) - 10 });
  });

  // Data rows
  let y = startY + 30;
  doc.fontSize(10).font('Helvetica');
  tourDetails.forEach(item => {
    // Get the matching agenda item for this tour detail if available
    const matchingAgendaItem = data.agendaItems?.find(agenda => 
      agenda.fromDate === item.fromDate && agenda.toDate === item.toDate
    ) || { agendaItem: '' };
    
    const rowData = [
      item.fromDate || 'N/A',
      item.modeOfTravel || 'N/A',
      item.from || 'N/A',
      item.to || 'N/A',
      // Use agenda item text if available, otherwise fallback to 'purpose' or 'N/A'
      matchingAgendaItem.agendaItem || item.purpose || item.majorPurpose || 'N/A'
    ];
    
    rowData.forEach((text, i) => {
      const x = 50 + (i * ((doc.page.width - 100) / 5));
      doc.text(text, x + 5, y + 5, { width: ((doc.page.width - 100) / 5) - 10 });
    });
    
    y += 30;
  });
}

function generateBillDetailsTable(doc, data, drawTableLine, drawTableBorders) {
  const startY = doc.y + 20;
  const endY = startY + ((data.bills?.length || 1) * 30) + 30;
  
  // Draw table with borders
  drawTableBorders(doc, startY, endY, 5);
  
  // Headers
  doc.fontSize(10).font('Helvetica-Bold');
  ['Hotel/Restaurant', 'Place', 'Bill No', 'Date', 'Amount'].forEach((header, i) => {
    const x = 50 + (i * ((doc.page.width - 100) / 5));
    doc.text(header, x + 5, startY + 5, { width: ((doc.page.width - 100) / 5) - 10 });
  });

  // Data rows
  let y = startY + 30;
  doc.fontSize(10).font('Helvetica');
  data.bills?.forEach(bill => {
    const rowData = [
      bill.name || 'N/A',
      bill.place || 'N/A',
      bill.billNo || 'N/A',
      bill.billDate || 'N/A',
      `₹${Number(bill.amount || 0).toLocaleString('en-IN')}`
    ];
    
    rowData.forEach((text, i) => {
      const x = 50 + (i * ((doc.page.width - 100) / 5));
      doc.text(text, x + 5, y + 5, { width: ((doc.page.width - 100) / 5) - 10 });
    });
    
    y += 30;
  });
}

function generateConveyanceTable(doc, data, drawTableLine, drawTableBorders) {
  const conveyances = data.conveyances || [];
  const startY = doc.y + 20;
  const endY = startY + ((conveyances.length || 1) * 30) + 30;
  
  // Draw table with borders
  drawTableBorders(doc, startY, endY, 5);
  
  // Headers
  doc.fontSize(10).font('Helvetica-Bold');
  ['Date', 'Place', 'From', 'To', 'Amount'].forEach((header, i) => {
    const x = 50 + (i * ((doc.page.width - 100) / 5));
    doc.text(header, x + 5, startY + 5, { width: ((doc.page.width - 100) / 5) - 10 });
  });

  // Data rows
  let y = startY + 30;
  doc.fontSize(10).font('Helvetica');
  conveyances.forEach(conveyance => {
    const rowData = [
      conveyance.date || 'N/A',
      conveyance.place || 'N/A',
      conveyance.from || 'N/A',
      conveyance.to || 'N/A',
      `₹${Number(conveyance.amount || 0).toLocaleString('en-IN')}`
    ];
    
    rowData.forEach((text, i) => {
      const x = 50 + (i * ((doc.page.width - 100) / 5));
      doc.text(text, x + 5, y + 5, { width: ((doc.page.width - 100) / 5) - 10 });
    });
    
    y += 30;
  });
}

function generateJourneyStatement(doc, data, drawTableLine, drawTableBorders) {
  const startY = doc.y + 20;
  const endY = startY + ((data.expenses?.length || 1) * 30) + 30;
  
  // Draw table with borders
  drawTableBorders(doc, startY, endY, 5);
  
  // Headers
  doc.fontSize(10).font('Helvetica-Bold');
  ['Date', 'Mode', 'From', 'To', 'Amount'].forEach((header, i) => {
    const x = 50 + (i * ((doc.page.width - 100) / 5));
    doc.text(header, x + 5, startY + 5, { width: ((doc.page.width - 100) / 5) - 10 });
  });

  // Data rows
  let y = startY + 30;
  doc.fontSize(10).font('Helvetica');
  data.expenses?.forEach(expense => {
    const rowData = [
      expense.date || 'N/A',
      `${expense.mode || 'N/A'} ${expense.class ? `(${expense.class})` : ''}`,
      expense.from || 'N/A',
      expense.to || 'N/A',
      `₹${Number(expense.amount || 0).toLocaleString('en-IN')}`
    ];
    
    rowData.forEach((text, i) => {
      const x = 50 + (i * ((doc.page.width - 100) / 5));
      doc.text(text, x + 5, y + 5, { width: ((doc.page.width - 100) / 5) - 10 });
    });
    
    y += 30;
  });
}

function generateFinalSummary(doc, data) {
  try {
    const { dailyAllowance, totalBillAmount, totalConveyanceAmount, totalExpenses, grandTotal } = data;
    
    // Set default values for empty fields
    const daDays = dailyAllowance?.daDays || '0';
    const daAmount = dailyAllowance?.daAmount || '0';
    const billTotal = totalBillAmount || 0;
    const conveyanceTotal = totalConveyanceAmount || 0;
    const expenseTotal = totalExpenses || 0;
    
    // Format currency values
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    });
    
    // Calculate available width
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const labelWidth = 250; // Increased to accommodate longer labels
    const valueWidth = pageWidth - labelWidth;
    
    // Draw section heading
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('FINAL SUMMARY', { align: 'center' });
    doc.moveDown(0.5);
    
    // Set font for data rows
    doc.font('Helvetica').fontSize(10);
    
    // Function to add a row
    const addRow = (label, value, isTotal = false) => {
      if (isTotal) doc.font('Helvetica-Bold');
      
      doc.text(label, doc.x, doc.y, { width: labelWidth, align: 'left' });
      doc.text(value, doc.x + labelWidth, doc.y, { width: valueWidth, align: 'right' });
      doc.moveDown(0.5);
      
      if (isTotal) doc.font('Helvetica');
    };
    
    // Add rows with consistent terminology and formatting
    addRow('1. Total Hotel/Restaurant Bill Amount:', formatter.format(billTotal));
    addRow('2. Total Conveyance Charges:', formatter.format(conveyanceTotal));
    addRow('3. Total Travel Expenses:', formatter.format(expenseTotal));
    
    // Add daily allowance if present
    if (daDays && parseInt(daDays) > 0 && daAmount && parseInt(daAmount) > 0) {
      addRow(`4. Daily Allowance (${daDays} days @ ${formatter.format(daAmount)}/day):`, formatter.format(daDays * daAmount));
    } else {
      addRow('4. Daily Allowance:', formatter.format(0));
    }
    
    // Add grand total
    doc.moveDown(0.5);
    // Recalculate grand total to ensure it includes conveyance
    const calculatedTotal = Number(billTotal) + Number(conveyanceTotal) + Number(expenseTotal) + 
                          (Number(daDays) * Number(daAmount));
    // Use provided grand total or calculate it
    const finalTotal = grandTotal || calculatedTotal;
    
    // Draw a line before the grand total
    doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.3);
    
    addRow('GRAND TOTAL:', formatter.format(finalTotal), true);
    
    return doc.y;
  } catch (error) {
    console.error('Error in generateFinalSummary:', error);
    // Continue with document generation despite errors
    return doc.y + 20;
  }
}

module.exports = { generateInvoice };