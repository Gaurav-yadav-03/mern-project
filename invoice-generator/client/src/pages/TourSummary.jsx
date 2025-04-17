import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/toursummary.css';

function TourSummary() {
  const [formData, setFormData] = useState({
    employeeName: "",
    department: "",
    tourPeriod: "",
    tourDetails: [
      {
        fromDate: "",
        toDate: "",
        modeOfTravel: "",
        from: "",
        to: "",
        contactAddress: "",
        telephoneNo: "",
        majorPurpose: "",
      },
    ],
  });

  const navigate = useNavigate();

  // Load data from BasicDetails when component mounts
  useEffect(() => {
    const existingData = JSON.parse(localStorage.getItem('invoiceData') || '{}');
    if (existingData.employee) {
      setFormData(prevData => ({
        ...prevData,
        employeeName: existingData.employee.employeeName || "",
        department: existingData.employee.department || "",
        tourPeriod: existingData.employee.tourPeriod || "",
      }));
    }
  }, []);

  const handleChange = (e, index = null, field = null) => {
    if (index !== null && field) {
      const newTourDetails = [...formData.tourDetails];
      newTourDetails[index][field] = e.target.value;
      setFormData({ ...formData, tourDetails: newTourDetails });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const addTourDetail = () => {
    setFormData({
      ...formData,
      tourDetails: [
        ...formData.tourDetails,
        {
          fromDate: "",
          toDate: "",
          modeOfTravel: "",
          from: "",
          to: "",
          contactAddress: "",
          telephoneNo: "",
          majorPurpose: "",
        },
      ],
    });
  };

  const deleteTourDetail = (index) => {
    if (formData.tourDetails.length > 1) {
      const newTourDetails = [...formData.tourDetails];
      newTourDetails.splice(index, 1);
      setFormData({ ...formData, tourDetails: newTourDetails });
    } else {
      alert('You must have at least one tour detail.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const existingData = JSON.parse(localStorage.getItem("invoiceData") || "{}");
    const updatedData = {
      ...existingData,
      tourSummary: formData,
    };
    console.log('Saving tour summary data:', updatedData);
    localStorage.setItem("invoiceData", JSON.stringify(updatedData));
    navigate("/bill-details");
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">National Cooperative Export Limited</h1>
        <h2 className="subtitle">Tour Programme</h2>
      </div>

      <form className="invoice-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Name of Employee</label>
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              onChange={handleChange}
              required
              readOnly
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              readOnly
            />
          </div>

          <div className="form-group">
            <label>Period of Tour</label>
            <input
              type="text"
              name="tourPeriod"
              value={formData.tourPeriod}
              onChange={handleChange}
              required
              readOnly
            />
          </div>
        </div>

        {formData.tourDetails.map((detail, index) => (
          <div key={index} className="tour-details-section">
            <div className="tour-detail-header">
              <h4>Tour Detail #{index + 1}</h4>
              <button 
                type="button" 
                className="delete-btn" 
                onClick={() => deleteTourDetail(index)}
                disabled={formData.tourDetails.length === 1}
              >
                Delete
              </button>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>From Date</label>
                <input
                  type="date"
                  value={detail.fromDate}
                  onChange={(e) => handleChange(e, index, "fromDate")}
                  required
                />
              </div>

              <div className="form-group">
                <label>To Date</label>
                <input
                  type="date"
                  value={detail.toDate}
                  onChange={(e) => handleChange(e, index, "toDate")}
                  min={detail.fromDate || undefined}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mode of Travel</label>
                <input
                  type="text"
                  placeholder="e.g., Flight, Train"
                  value={detail.modeOfTravel}
                  onChange={(e) => handleChange(e, index, "modeOfTravel")}
                  required
                />
              </div>

              <div className="form-group">
                <label>From</label>
                <input
                  type="text"
                  placeholder="Starting location"
                  value={detail.from}
                  onChange={(e) => handleChange(e, index, "from")}
                  required
                />
              </div>

              <div className="form-group">
                <label>To</label>
                <input
                  type="text"
                  placeholder="Destination"
                  value={detail.to}
                  onChange={(e) => handleChange(e, index, "to")}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Address</label>
                <input
                  type="text"
                  placeholder="Contact address during tour"
                  value={detail.contactAddress}
                  onChange={(e) => handleChange(e, index, "contactAddress")}
                  required
                />
              </div>

              <div className="form-group">
                <label>Telephone No</label>
                <input
                  type="tel"
                  placeholder="Contact number"
                  value={detail.telephoneNo}
                  onChange={(e) => handleChange(e, index, "telephoneNo")}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Major Purpose of Tour</label>
                <textarea
                  placeholder="Purpose of the tour"
                  value={detail.majorPurpose}
                  onChange={(e) => handleChange(e, index, "majorPurpose")}
                  required
                  rows="3"
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="add-btn" onClick={addTourDetail}>
          Add More Tour Detail
        </button>

        <button type="submit" className="save-btn">
          Save & Next
        </button>
      </form>
    </div>
  );
}

export default TourSummary;
