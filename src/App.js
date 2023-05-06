import React from "react";
import { Routes, Route } from "react-router-dom";
import Test from "./Test";
import Navbar from "./Navbar";


function App() {
  
  return (
    <>
      <Navbar/>
      <Routes>
        <Route path="/" element={ <Test/> } />
      </Routes>
    </>
  );
}

export default App;