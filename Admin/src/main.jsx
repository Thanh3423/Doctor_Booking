import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from './App.jsx'
import "./index.css";
import AdminContextProvider from "./context/AdminContext.jsx";
import AppContextProvider from "./context/AppContext.jsx";
import DoctorContextProvider from "./context/DoctorContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter
    future={{
      v7_startTransition: true,v7_relativeSplatPath: true
    }}>
      <AdminContextProvider>
        <DoctorContextProvider>
          <AppContextProvider>
            <App />           
          </AppContextProvider>
        </DoctorContextProvider>
      </AdminContextProvider>
    </BrowserRouter>
  </StrictMode>
);
