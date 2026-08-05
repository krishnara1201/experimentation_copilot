import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { loginUser, registerUser } from '../services/api';

const useAuth = () => {
    const [error, setError] = useState(null);

    const login = useMutation(loginUser, {
        onError: (err) => {
            setError(err);
        },
    });

    const register = useMutation(registerUser, {
        onError: (err) => {
            setError(err);
        },
    });

    return {
        login,
        register,
        error,
    };
};

export default useAuth;