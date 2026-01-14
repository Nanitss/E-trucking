import { useEffect, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Logout = () => {
  const { logout } = useContext(AuthContext);
  const history = useHistory();

  useEffect(() => {
    logout();
    history.push('/login');
  }, [logout, history]);

  return null;
};

export default Logout;