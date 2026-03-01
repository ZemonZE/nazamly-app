import { useState } from "react";
import "./App.css";
import Login from "./components/Login";
import InfoPanel from "./components/InfoPanel";

function App() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <a href="#">
            <h1>نظملي</h1>
          </a>
          <p className="tagline">Admin Dashboard — لوحة تحكم المسؤول</p>
          <span className="admin-badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Admin Dashboard
          </span>
        </div>

        <div className="auth-content">
          <InfoPanel />
          <Login />
        </div>
      </div>
    </div>
  );
}

export default App;
