# B2B Analytics Frontend

This project is a B2B analytics frontend built with React and TypeScript, utilizing Vite for fast development and build processes. The application is designed to provide a clean and efficient interface for managing experiments and analyzing results.

## Features

- **Experiments List**: View and manage a list of experiments with status indicators and quick actions.
- **Create Experiment Wizard**: A multi-step wizard to guide users through the experiment creation process.
- **Planning Page**: Tools for designing experiments, including sample-size cards and assumption editors.
- **Upload Page**: Functionality for uploading analysis inputs, including CSV uploads.
- **Results Dashboard**: Analyze experiment outcomes with KPI cards and visualizations.
- **Summary Page**: Present final decisions with recommendations and export options.
- **Authentication**: User registration and login functionality.

## Technologies Used

- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
- **Vite**: A fast build tool and development server.
- **TanStack Query**: For server-state management and data fetching.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **Plotly/Recharts**: Libraries for rendering interactive charts and visualizations.

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd b2b-analytics-frontend
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the development server**:
   ```
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` to view the application.

## Folder Structure

```
frontend
├── public
├── src
│   ├── components
│   ├── pages
│   ├── hooks
│   ├── services
│   ├── styles
│   ├── utils
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.