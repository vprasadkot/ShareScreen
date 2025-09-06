import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ClientPage from './ClientPage';
import HostPage from './HostPage';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <nav style={{ marginBottom: 20 }}>
        <Link to="/client" style={{ marginRight: 10 }}>Client</Link>
        <Link to="/host">Host</Link>
      </nav>
      <Routes>
        <Route path="/client" element={<ClientPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/" element={<div><h1>Welcome to ShareScreen</h1><p>Select Client or Host above.</p></div>} />
      </Routes>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </Router>
  )
}

export default App
