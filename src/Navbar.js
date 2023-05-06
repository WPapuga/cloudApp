import React from 'react';
import "./Navbar.css";
import { Link, useMatch, useResolvedPath } from "react-router-dom";
import { useNavigate } from 'react-router-dom';


function Greeting(props) {
  const navigate = useNavigate();
  const handleButtonClickGoogle = () => {
    navigate('/login', { replace: true });
    window.location.reload(); 
  };
  const handleButtonClickGitHub = () => {
    navigate('/loginGH', { replace: true });
    window.location.reload(); 
  };
  return ( 
      <div className="Navbar">
      <div className="NavLeftSide">
          <Link to="/">Cloud App WP</Link>
      </div>
      <div className="NavLinks">
          <CustomLink to="/">Strona Główna</CustomLink>
          <CustomLink to="/">Wyposażenie</CustomLink>
          <CustomLink to="/">Ryby</CustomLink>
          {sessionStorage.getItem('isLogged') === "true" ? <CustomLink to="/">Moje Akwaria</CustomLink> : <div></div>}
      </div>
      <div className="NavSigning">
          {sessionStorage.getItem('isLogged') === "true" ? 
              <CustomLink to="/">Wyloguj</CustomLink>
              :
              <>
              <button onClick={handleButtonClickGoogle}>Zaloguj się Google</button>
              <button onClick={handleButtonClickGitHub}>Zaloguj się Github</button>
              </>
          }
      </div>
      </div>
  );
}

function Navbar() {
  return (
    <Greeting isLoggedIn={true} />
  )
}

function CustomLink({ to, children, ...props }) {
  const resolvedPath = useResolvedPath(to);
  const isActive = useMatch({ path: resolvedPath.pathname, end: true });
  return (
    <div className={isActive ? "active" : ""}>
          <Link to={to} {...props}>{children}</Link>
    </div>
  )
}

export default Navbar