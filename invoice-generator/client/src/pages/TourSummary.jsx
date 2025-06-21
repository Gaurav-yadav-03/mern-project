import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/toursummary.css';

// Define common mode of travel options
const TRAVEL_MODES = ['Car', 'Bike', 'Taxi', 'Bus', 'Train', 'Flight', 'Metro', 'Other'];

// Define common Indian cities
const COMMON_CITIES = [
  'Delhi',
  'Mumbai',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Bhopal',
  'Kochi',
  'Guwahati',
  'Patna',
  'Indore',
  'Nagpur',
  'Surat',
  'Visakhapatnam',
  'Coimbatore',
  'Other'
];

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
        telephoneNo: "",
        majorPurpose: "",
        // Track if custom options are selected
        isCustomMode: false,
        isCustomFromCity: false,
        isCustomToCity: false
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
      
      // Handle custom mode of travel input
      if (field === "customModeOfTravel") {
        newTourDetails[index].modeOfTravel = e.target.value;
        setFormData({ ...formData, tourDetails: newTourDetails });
        return;
      }
      
      // Handle custom from city input
      if (field === "customFrom") {
        newTourDetails[index].from = e.target.value;
        setFormData({ ...formData, tourDetails: newTourDetails });
        return;
      }
      
      // Handle custom to city input
      if (field === "customTo") {
        newTourDetails[index].to = e.target.value;
        setFormData({ ...formData, tourDetails: newTourDetails });
        return;
      }
      
      // Handle telephone number - restrict to numbers only and max 10 digits
      if (field === "telephoneNo") {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) {
          // For first digit, only allow 6-9 (valid Indian mobile numbers)
          if (value.length === 0 || value.length > 1 || /^[6-9]/.test(value)) {
            newTourDetails[index][field] = value;
          }
        }
        setFormData({ ...formData, tourDetails: newTourDetails });
        return;
      }
      
      newTourDetails[index][field] = e.target.value;
      
      // If selecting "Other" for mode, set isCustomMode to true
      if (field === "modeOfTravel" && e.target.value === "Other") {
        newTourDetails[index].isCustomMode = true;
      } else if (field === "modeOfTravel") {
        newTourDetails[index].isCustomMode = false;
      }
      
      // Handle custom city selection for "From"
      if (field === "from" && e.target.value === "Other") {
        newTourDetails[index].isCustomFromCity = true;
      } else if (field === "from") {
        newTourDetails[index].isCustomFromCity = false;
      }
      
      // Handle custom city selection for "To"
      if (field === "to" && e.target.value === "Other") {
        newTourDetails[index].isCustomToCity = true;
      } else if (field === "to") {
        newTourDetails[index].isCustomToCity = false;
      }
      
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
          telephoneNo: "",
          majorPurpose: "",
          isCustomMode: false,
          isCustomFromCity: false,
          isCustomToCity: false
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
    
    // Validate phone numbers before submission
    for (let i = 0; i < formData.tourDetails.length; i++) {
      const phone = formData.tourDetails[i].telephoneNo;
      // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
      if (!/^[6-9]\d{9}$/.test(phone)) {
        alert(`Tour Detail #${i+1}: Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9`);
        return;
      }
    }
    
    // Clean up the data before saving by removing the tracking flags
    const tourDetailsForStorage = formData.tourDetails.map(detail => {
      const { isCustomMode, isCustomFromCity, isCustomToCity, ...cleanDetail } = detail;
      return cleanDetail;
    });
    
    const dataToStore = {
      ...formData,
      tourDetails: tourDetailsForStorage
    };
    
    const existingData = JSON.parse(localStorage.getItem("invoiceData") || "{}");
    const updatedData = {
      ...existingData,
      tourSummary: dataToStore,
    };
    console.log('Saving tour summary data:', updatedData);
    localStorage.setItem("invoiceData", JSON.stringify(updatedData));
    navigate("/bill-details");
  };

  // Helper function to format phone number with +91 prefix
  const formatPhoneNumber = (number) => {
    if (!number) return '';
    return `+91 ${number}`;
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Professional Invoice Generator</h1>
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
                {detail.isCustomMode ? (
                  <input
                    type="text"
                    placeholder="Enter mode of travel"
                    value={detail.modeOfTravel}
                    onChange={(e) => handleChange(e, index, "customModeOfTravel")}
                    required
                  />
                ) : (
                  <select
                    value={detail.modeOfTravel}
                    onChange={(e) => handleChange(e, index, "modeOfTravel")}
                    required
                  >
                    <option value="">Select Mode</option>
                    {TRAVEL_MODES.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>From</label>
                {detail.isCustomFromCity ? (
                  <input
                    type="text"
                    placeholder="Enter departure city"
                    value={detail.from}
                    onChange={(e) => handleChange(e, index, "customFrom")}
                    required
                  />
                ) : (
                  <select
                    value={detail.from}
                    onChange={(e) => handleChange(e, index, "from")}
                    required
                  >
                    <option value="">Select City</option>
                    {COMMON_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="Other">Other (Enter manually)</option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>To</label>
                {detail.isCustomToCity ? (
                  <input
                    type="text"
                    placeholder="Enter destination city"
                    value={detail.to}
                    onChange={(e) => handleChange(e, index, "customTo")}
                    required
                  />
                ) : (
                  <select
                    value={detail.to}
                    onChange={(e) => handleChange(e, index, "to")}
                    required
                  >
                    <option value="">Select City</option>
                    {COMMON_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="Other">Other (Enter manually)</option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <div className="phone-input-container" style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#f5f5f5', 
                    border: '1px solid #ccc',
                    borderRight: 'none',
                    borderRadius: '4px 0 0 4px'
                  }}>+91</span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number (start with 6-9)"
                    value={detail.telephoneNo}
                    onChange={(e) => handleChange(e, index, "telephoneNo")}
                    required
                    pattern="[6-9][0-9]{9}"
                    maxLength="10"
                    style={{ 
                      borderRadius: '0 4px 4px 0',
                      flex: 1
                    }}
                    title="Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
                  />
                </div>
                {detail.telephoneNo && detail.telephoneNo.length === 10 && !/^[6-9]/.test(detail.telephoneNo) && (
                  <p style={{ color: 'red', margin: '5px 0 0', fontSize: '12px' }}>
                    Mobile number must start with 6, 7, 8, or 9
                  </p>
                )}
                {detail.telephoneNo && detail.telephoneNo.length > 0 && detail.telephoneNo.length < 10 && (
                  <p style={{ color: 'red', margin: '5px 0 0', fontSize: '12px' }}>
                    Please enter all 10 digits
                  </p>
                )}
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
