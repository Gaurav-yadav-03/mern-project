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

      console.log('Creating PDF document');
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
      
      const filePath = path.join(generatedDir, `invoice-${Date.now()}.pdf`);
      console.log('Writing PDF to:', filePath);
      const stream = fs.createWriteStream(filePath);
      
      // Handle stream errors
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        reject(new Error('Failed to create PDF file stream'));
      });

      doc.pipe(stream);

      // Draw table borders and lines
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
      doc.text(`Destination: ${data.employee?.destination || 'N/A'}`);
      doc.text(`Purpose: ${data.purpose || 'N/A'}`);
      doc.text(`From Date: ${data.employee?.fromDate || 'N/A'}`);
      doc.text(`To Date: ${data.employee?.toDate || 'N/A'}`);

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
        for (const bill of data.bills) {
          doc.addPage();
          doc.fontSize(16).font('Helvetica-Bold').text('Bill Attachment', { align: 'center' });
          doc.moveDown(2);
          if (bill.fileUrl) {
            try {
              // Check if file exists before trying to add it
              if (fs.existsSync(bill.fileUrl)) {
                doc.image(bill.fileUrl, {
                  fit: [500, 650],
                  align: 'center'
                });
              } else {
                doc.text('Bill file not found', { align: 'center' });
              }
            } catch (error) {
              console.error('Error adding bill image:', error);
              doc.text('Error loading bill image', { align: 'center' });
            }
          }
        }
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
    const rowData = [
      item.fromDate || 'N/A',
      item.modeOfTravel || 'N/A',
      item.from || 'N/A',
      item.to || 'N/A',
      item.purpose || 'N/A'
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
    const { dailyAllowance, totalBillAmount, totalExpenses, grandTotal } = data;
    
    // Set default values for empty fields
    const daDays = dailyAllowance?.daDays || '0';
    const daAmount = dailyAllowance?.daAmount || '0';
    const billTotal = totalBillAmount || 0;
    const expenseTotal = totalExpenses || 0;
    
    // Format currency values
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    });
    
    // Calculate available width
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const labelWidth = 150;
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
    
    // Add rows
    addRow('Total Bill Amount:', formatter.format(billTotal));
    addRow('Total Expenses:', formatter.format(expenseTotal));
    
    // Add daily allowance if present
    if (daDays && parseInt(daDays) > 0 && daAmount && parseInt(daAmount) > 0) {
      addRow(`D.A. for ${daDays} days @ ${formatter.format(daAmount)} per day:`, formatter.format(daDays * daAmount));
    } else {
      addRow('Daily Allowance:', formatter.format(0));
    }
    
    // Add grand total
    doc.moveDown(0.5);
    addRow('GRAND TOTAL:', formatter.format(grandTotal || 0), true);
    
    return doc.y;
  } catch (error) {
    console.error('Error in generateFinalSummary:', error);
    // Continue with document generation despite errors
    return doc.y + 20;
  }
}

module.exports = { generateInvoice };