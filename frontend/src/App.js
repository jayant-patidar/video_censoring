import logo from './logo.svg';
import "./App.css";
import Router from "./routes";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";

function App() {
  return (
    <div>
      <BrowserRouter>
          <Router />
      </BrowserRouter>
    </div>
  );
}

export default App;
