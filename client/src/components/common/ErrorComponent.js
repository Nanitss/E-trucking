import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ErrorComponent = ({ message = 'An error occurred' }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        py: 4 
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          maxWidth: '600px',
          width: '100%',
          borderRadius: 2
        }}
      >
        <Alert 
          severity="error"
          icon={<ErrorOutlineIcon fontSize="inherit" />}
          sx={{ mb: 2 }}
        >
          Error
        </Alert>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ErrorComponent; 