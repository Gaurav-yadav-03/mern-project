# Invoicely - Professional Invoice Generator

A modern, open-source invoice generator designed specifically for Indian companies. Create professional invoices, manage expenses, and generate detailed tour reports with ease.

## 🌟 Features

- **Professional Invoice Generation**: Create detailed, customizable invoices
- **Expense Management**: Track and categorize business expenses
- **Tour & Travel Reports**: Generate comprehensive travel expense reports
- **Multi-format Support**: Export to PDF with professional formatting
- **User Authentication**: Secure login system with role-based access
- **Admin Dashboard**: Manage users and invoices with admin controls
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Indian Business Focus**: Optimized for Indian companies with Indian cities and phone number validation

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/invoicely.git
   cd invoicely
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   # In the server directory, create a .env file
   cd ../server
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   PORT=5000
   ```

4. **Start the application**
   ```bash
   # Start the server (from server directory)
   npm start
   
   # Start the client (from client directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## 📁 Project Structure

```
invoicely/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── context/       # React context providers
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── controllers/       # Request handlers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   └── uploads/          # File uploads
└── README.md
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **React Router** - Client-side routing
- **CSS Modules** - Scoped styling
- **Axios** - HTTP client
- **React Signature Canvas** - Digital signatures

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **PDFKit** - PDF generation
- **Multer** - File uploads

## 📋 Usage

### Creating an Invoice

1. **Basic Details**: Enter employee and tour information
2. **Tour Summary**: Add travel details and destinations
3. **Bill Details**: Upload receipts and add expenses
4. **Expenses**: Track conveyance and daily allowances
5. **Generate**: Create and download the final invoice

### Admin Features

- Manage user accounts
- View all generated invoices
- Monitor system usage
- Export data reports

## 🔧 Configuration

### Customizing for Your Indian Company

1. **Update Company Information**
   - Modify `client/src/components/BasicDetails.jsx`
   - Update PDF templates in `server/invoice.js`

2. **Add Custom Indian Cities**
   - Edit city lists in form components
   - Update validation rules as needed

3. **Customize Styling**
   - Modify CSS modules in `client/src/`
   - Update theme colors and branding

4. **Indian Phone Number Validation**
   - Supports Indian mobile numbers (10 digits starting with 6-9)
   - Automatic +91 prefix formatting

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join our discussions for help and ideas

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for better invoice management tools
- Thanks to all contributors and the open-source community

## 📈 Roadmap

- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] API integrations
- [ ] Mobile app
- [ ] Cloud deployment options
- [ ] Advanced analytics

---

**Made with ❤️ by the Invoicely Team** 