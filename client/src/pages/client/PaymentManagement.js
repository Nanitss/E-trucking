import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Grid,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Launch as LaunchIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as WalletIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { format, differenceInDays } from "date-fns";
import { AuthContext } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";
import "../../styles/ClientPage.css";

const PaymentManagement = () => {
  const history = useHistory();
  const { authUser } = useContext(AuthContext) || { authUser: null };
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });

  // Payment form states
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    cardholderName: "",
  });

  const [billingInfo, setBillingInfo] = useState({
    email: "",
    phone: "",
    name: "",
  });

  const paymentSteps = [
    "Select Payment Method",
    "Enter Payment Details",
    "Process Payment",
  ];

  // Helper function to get user data from multiple sources
  const getUserData = () => {
    // Try to get from AuthContext first
    if (authUser) {
      return {
        id: authUser.id || authUser.clientId,
        clientId: authUser.clientId || authUser.id,
        email: authUser.email,
        phone: authUser.phone,
        name: authUser.clientName || authUser.username || authUser.name,
        clientName: authUser.clientName || authUser.username || authUser.name,
      };
    }

    // Fallback to localStorage with storage availability check
    try {
      // Check if storage is available before trying to access it
      if (
        typeof Storage !== "undefined" &&
        typeof localStorage !== "undefined"
      ) {
        const userDataString = localStorage.getItem("userData");
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          return {
            id: userData.id || userData.clientId,
            clientId: userData.clientId || userData.id,
            email: userData.email,
            phone: userData.phone,
            name: userData.clientName || userData.username || userData.name,
            clientName:
              userData.clientName || userData.username || userData.name,
          };
        }

        // Also try 'currentUser' key as fallback
        const currentUserString = localStorage.getItem("currentUser");
        if (currentUserString) {
          const currentUser = JSON.parse(currentUserString);
          return {
            id: currentUser.id || currentUser.clientId,
            clientId: currentUser.clientId || currentUser.id,
            email: currentUser.email,
            phone: currentUser.phone,
            name:
              currentUser.clientName ||
              currentUser.username ||
              currentUser.name,
            clientName:
              currentUser.clientName ||
              currentUser.username ||
              currentUser.name,
          };
        }

        // Try to get from token payload (if JWT)
        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          return {
            id: payload.id || payload.clientId || payload.sub,
            clientId: payload.clientId || payload.id || payload.sub,
            email: payload.email,
            phone: payload.phone,
            name: payload.clientName || payload.username || payload.name,
            clientName: payload.clientName || payload.username || payload.name,
          };
        }
      } else {
        console.warn("LocalStorage is not available in this browser context");
      }
    } catch (e) {
      console.warn("Error accessing localStorage:", e);
    }

    // Return a default user if all else fails (for testing)
    console.warn("Unable to get user data from any source, using fallback");
    return {
      id: "j412kdTjjvNNXWdLTHAc",
      clientId: "j412kdTjjvNNXWdLTHAc",
      email: "test@example.com",
      phone: "+639123456789",
      name: "Test Client",
      clientName: "Test Client",
    };
  };

  useEffect(() => {
    fetchPaymentSummary();

    // Load user billing info from available sources
    const userData = getUserData();
    if (userData) {
      setBillingInfo({
        email: userData.email || "",
        phone: userData.phone || "",
        name: userData.name || "",
      });
    }
  }, [authUser]);

  const fetchPaymentSummary = async () => {
    try {
      setLoading(true);

      // Safely get token with storage availability check
      let token = null;
      try {
        if (
          typeof Storage !== "undefined" &&
          typeof localStorage !== "undefined"
        ) {
          token = localStorage.getItem("token");
        }
      } catch (storageError) {
        console.warn("Cannot access localStorage for token:", storageError);
      }

      if (!token) {
        setError("Authentication token missing. Please login again.");
        return;
      }

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Get client ID from available user data sources
      const userData = getUserData();
      if (!userData || !userData.id) {
        setError(
          "Unable to identify client. Please refresh the page or login again.",
        );
        return;
      }

      // Use the user's login ID directly as clientId (since we fixed the delivery records)
      const clientId = userData.id;

      console.log("Fetching payments for user ID:", clientId);

      // Use the main server endpoint for payments
      const response = await axios.get(`/api/payments/client/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-client-id": clientId,
        },
      });

      setPaymentSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching payment summary:", error);
      if (error.response?.status === 403) {
        setError(
          "Access denied. Please check your permissions or login again.",
        );
      } else {
        setError(
          error.response?.data?.error ||
            error.response?.data?.message ||
            "Failed to load payment information",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (payment) => {
    setSelectedPayment(payment);
    setPaymentFormOpen(true);
    setPaymentStep(0);
    setPaymentMethod("");
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setPaymentStep(1);
  };

  const handleCardInputChange = (field, value) => {
    // Format card number input
    if (field === "cardNumber") {
      value = value
        .replace(/\s/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim();
      if (value.length > 19) return; // Limit to 16 digits + spaces
    }

    // Format expiry inputs
    if (field === "expiryMonth" || field === "expiryYear") {
      value = value.replace(/\D/g, "");
      if (field === "expiryMonth" && value.length > 2) return;
      if (field === "expiryYear" && value.length > 4) return;
    }

    // Format CVC
    if (field === "cvc") {
      value = value.replace(/\D/g, "");
      if (value.length > 4) return;
    }

    setCardForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const processCardPayment = async () => {
    try {
      setProcessingPayment(true);
      setPaymentStep(2);

      // Validate card form
      const { cardNumber, expiryMonth, expiryYear, cvc, cardholderName } =
        cardForm;
      if (
        !cardNumber ||
        !expiryMonth ||
        !expiryYear ||
        !cvc ||
        !cardholderName
      ) {
        throw new Error("Please fill in all card details");
      }

      // Get JWT token from localStorage
      let token = localStorage.getItem("token");

      // Enhanced token validation
      if (!token) {
        setError(
          "Please log in to make payments. Redirecting to login page...",
        );
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      // Check if token is valid format (basic validation)
      if (!token.includes(".") || token.length < 50) {
        setError("Invalid session. Please log out and log in again.");
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }, 2000);
        return;
      }

      console.log("Making card payment request with valid token");

      // Process payment through main server
      const response = await axios.post(
        "/api/payments/process-card",
        {
          deliveryId: selectedPayment.id,
          cardDetails: {
            number: cardNumber.replace(/\s/g, ""),
            exp_month: expiryMonth,
            exp_year: expiryYear,
            cvc: cvc,
          },
          billingDetails: {
            name: cardholderName,
            email: billingInfo.email || userData?.email || "test@example.com",
            phone: billingInfo.phone || userData?.phone || "+639123456789",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setPaymentDialogOpen(true);
        setPaymentFormOpen(false);
        await fetchPaymentSummary(); // Refresh payment data

        // Show success message
        setAlert({
          show: true,
          message:
            "Card payment processed successfully! Your delivery has been paid.",
          severity: "success",
        });
      } else {
        throw new Error(response.data.error || "Payment failed");
      }
    } catch (error) {
      console.error("Error processing card payment:", error);

      // Enhanced error handling with specific messages
      if (error.response?.status === 401) {
        setError(
          "Your session has expired. Please log out and log in again to continue with payment.",
        );
      } else if (error.response?.status === 403) {
        setError(
          "Access denied. Please ensure you are logged in with the correct account.",
        );
      } else if (error.response?.status === 404) {
        setError(
          "Payment service is currently unavailable. Please try again later or contact support.",
        );
      } else if (error.response?.status === 500) {
        setError(
          "Server error occurred while processing your card payment. Please try again later or contact support.",
        );
      } else if (
        error.code === "ECONNREFUSED" ||
        error.message.includes("Network Error")
      ) {
        setError(
          "Unable to connect to payment service. Please check your internet connection and try again.",
        );
      } else if (error.response?.data?.message === "Invalid token") {
        setError(
          "Your session is invalid. Please log out and log in again to continue with payment.",
        );
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }, 3000);
      } else {
        setError(
          error.response?.data?.message ||
            error.message ||
            "Card payment processing failed. Please try again.",
        );
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  const processEWalletPayment = async () => {
    try {
      setProcessingPayment(true);
      setPaymentStep(2);

      // Get user data for the request
      const userData = getUserData();
      if (!userData) {
        throw new Error(
          "Unable to identify user. Please refresh and try again.",
        );
      }

      // Get JWT token from localStorage
      let token = localStorage.getItem("token");

      // If no token, try to get from other sources or show helpful error
      if (!token) {
        // Check if user is logged in via AuthContext
        if (authUser) {
          setError(
            "Session expired. Please log out and log in again to continue with payment.",
          );
          return;
        } else {
          setError(
            "Please log in to make payments. Redirecting to login page...",
          );
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          return;
        }
      }

      console.log(
        "Making payment request with token:",
        token.substring(0, 20) + "...",
      );

      // Process e-wallet payment through main server
      const response = await axios.post(
        "/api/payments/process-ewallet",
        {
          deliveryId: selectedPayment.id, // Use deliveryId as expected by real PayMongo route
          paymentMethod: paymentMethod,
          billingDetails: {
            name: billingInfo.name || userData.clientName || "Test Client",
            email: billingInfo.email || userData.email || "test@example.com",
            phone: billingInfo.phone || userData.phone || "+639123456789",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success && response.data.data.checkoutUrl) {
        // Redirect to PayMongo checkout page
        window.location.href = response.data.data.checkoutUrl;
      } else {
        throw new Error(
          response.data.error || "Failed to initiate e-wallet payment",
        );
      }
    } catch (error) {
      console.error("Error processing e-wallet payment:", error);

      // Handle different types of errors
      if (error.response?.status === 401) {
        setError(
          "Session expired. Please log out and log in again to continue with payment.",
        );
      } else if (error.response?.status === 404) {
        setError(
          "Payment service is currently unavailable. Please try again later or contact support.",
        );
      } else if (error.response?.status === 500) {
        setError(
          "Server error occurred. Please try again later or contact support.",
        );
      } else if (
        error.code === "ECONNREFUSED" ||
        error.message.includes("Network Error")
      ) {
        setError(
          "Unable to connect to payment service. Please check your internet connection and try again.",
        );
      } else {
        setError(
          error.response?.data?.message ||
            error.message ||
            "E-wallet payment failed. Please try again.",
        );
      }

      setProcessingPayment(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (paymentMethod === "card") {
      processCardPayment();
    } else if (["gcash", "grab_pay", "paymaya"].includes(paymentMethod)) {
      processEWalletPayment();
    }
  };

  const createPaymentLink = async (payment) => {
    try {
      setProcessingPayment(true);
      const response = await axios.post(
        `http://localhost:5010/api/payments/${payment.id}/create-link`,
      );

      if (response.data.success) {
        // Open payment link in new tab
        window.open(response.data.data.paymentLinkUrl, "_blank");
        setAlert({
          show: true,
          type: "success",
          message:
            "Payment link created! Check the new tab to complete payment.",
        });
      }
    } catch (error) {
      console.error("Error creating payment link:", error);
      setAlert({
        show: true,
        type: "error",
        message: "Failed to create payment link. Please try again.",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Generate payment records from existing deliveries
  const generatePaymentsFromDeliveries = async () => {
    try {
      setLoading(true);
      setAlert({ show: false });

      const response = await axios.post(
        "http://localhost:5010/api/payments/generate-from-deliveries",
      );

      if (response.data.success) {
        setAlert({
          show: true,
          type: "success",
          message: response.data.message,
        });

        // Refresh payment data
        await fetchPaymentSummary();
      }
    } catch (error) {
      console.error("Error generating payments from deliveries:", error);
      setAlert({
        show: true,
        type: "error",
        message:
          "Failed to generate payments from deliveries. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (status, dueDate) => {
    if (status === "paid") return "success";
    if (status === "overdue") return "error";
    if (status === "failed") return "error";

    // Check if pending payment is approaching due date
    if (status === "pending" && dueDate) {
      const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
      if (daysUntilDue <= 5) return "warning";
    }

    return "default";
  };

  const getPaymentStatusIcon = (status, dueDate) => {
    if (status === "paid") return <CheckCircleIcon />;
    if (status === "overdue" || status === "failed") return <WarningIcon />;

    if (status === "pending" && dueDate) {
      const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
      if (daysUntilDue <= 5) return <ScheduleIcon />;
    }

    return <PaymentIcon />;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy");
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    return days;
  };

  const renderPaymentMethodSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Payment Method
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              cursor: "pointer",
              border:
                paymentMethod === "card"
                  ? "2px solid #1976d2"
                  : "1px solid #ddd",
              "&:hover": { boxShadow: 3 },
            }}
            onClick={() => handlePaymentMethodSelect("card")}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <CreditCardIcon sx={{ fontSize: 40, color: "#1976d2", mb: 1 }} />
              <Typography variant="h6">Credit/Debit Card</Typography>
              <Typography variant="body2" color="textSecondary">
                Visa, Mastercard
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              cursor: "pointer",
              border:
                paymentMethod === "gcash"
                  ? "2px solid #1976d2"
                  : "1px solid #ddd",
              "&:hover": { boxShadow: 3 },
            }}
            onClick={() => handlePaymentMethodSelect("gcash")}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <WalletIcon sx={{ fontSize: 40, color: "#007dff", mb: 1 }} />
              <Typography variant="h6">GCash</Typography>
              <Typography variant="body2" color="textSecondary">
                Pay with GCash wallet
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              cursor: "pointer",
              border:
                paymentMethod === "grab_pay"
                  ? "2px solid #1976d2"
                  : "1px solid #ddd",
              "&:hover": { boxShadow: 3 },
            }}
            onClick={() => handlePaymentMethodSelect("grab_pay")}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <WalletIcon sx={{ fontSize: 40, color: "#00b14f", mb: 1 }} />
              <Typography variant="h6">GrabPay</Typography>
              <Typography variant="body2" color="textSecondary">
                Pay with GrabPay wallet
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              cursor: "pointer",
              border:
                paymentMethod === "paymaya"
                  ? "2px solid #1976d2"
                  : "1px solid #ddd",
              "&:hover": { boxShadow: 3 },
            }}
            onClick={() => handlePaymentMethodSelect("paymaya")}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <WalletIcon sx={{ fontSize: 40, color: "#5bc500", mb: 1 }} />
              <Typography variant="h6">PayMaya</Typography>
              <Typography variant="body2" color="textSecondary">
                Pay with PayMaya wallet
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderPaymentForm = () => {
    if (paymentMethod === "card") {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Enter Card Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cardholder Name"
                value={cardForm.cardholderName}
                onChange={(e) =>
                  handleCardInputChange("cardholderName", e.target.value)
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Card Number"
                value={cardForm.cardNumber}
                onChange={(e) =>
                  handleCardInputChange("cardNumber", e.target.value)
                }
                placeholder="1234 5678 9012 3456"
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Month"
                value={cardForm.expiryMonth}
                onChange={(e) =>
                  handleCardInputChange("expiryMonth", e.target.value)
                }
                placeholder="MM"
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Year"
                value={cardForm.expiryYear}
                onChange={(e) =>
                  handleCardInputChange("expiryYear", e.target.value)
                }
                placeholder="YYYY"
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="CVC"
                value={cardForm.cvc}
                onChange={(e) => handleCardInputChange("cvc", e.target.value)}
                placeholder="123"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Billing Information
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={billingInfo.email}
                onChange={(e) =>
                  setBillingInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={billingInfo.phone}
                onChange={(e) =>
                  setBillingInfo((prev) => ({ ...prev, phone: e.target.value }))
                }
                required
              />
            </Grid>
          </Grid>
        </Box>
      );
    } else {
      return (
        <Box textAlign="center">
          <WalletIcon sx={{ fontSize: 60, color: "#1976d2", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {paymentMethod === "gcash" && "GCash Payment"}
            {paymentMethod === "grab_pay" && "GrabPay Payment"}
            {paymentMethod === "paymaya" && "PayMaya Payment"}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            You will be redirected to{" "}
            {paymentMethod === "gcash"
              ? "GCash"
              : paymentMethod === "grab_pay"
                ? "GrabPay"
                : "PayMaya"}{" "}
            to complete your payment.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Amount to pay:{" "}
            <strong>{formatCurrency(selectedPayment?.amount || 0)}</strong>
          </Typography>
        </Box>
      );
    }
  };

  if (loading) {
    return (
      <div className="client-page-container">
        <Loader message="Loading payment history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-page-container">
        <Alert severity="error" sx={{ mt: 3, mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={fetchPaymentSummary}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="client-page-container">
      {/* Header with Back Button */}
      <div className="client-page-header">
        <h1>
          <PaymentIcon /> Payment Management
        </h1>
        <div className="header-actions">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => history.push("/client/dashboard")}
            variant="outlined"
            sx={{ borderColor: "var(--gray-300)", color: "var(--gray-700)" }}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {alert.show && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert({ show: false })}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Payment Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Outstanding
              </Typography>
              <Typography variant="h5" component="h2" color="error">
                {formatCurrency(paymentSummary?.totalAmountDue || 0)}
              </Typography>
              <Typography variant="body2">
                {(paymentSummary?.pendingPayments || 0) +
                  (paymentSummary?.overduePayments || 0)}{" "}
                payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Overdue Payments
              </Typography>
              <Typography variant="h5" component="h2" color="error">
                {paymentSummary?.overduePayments || 0}
              </Typography>
              <Typography variant="body2" color="error">
                {paymentSummary?.overduePayments > 0
                  ? "Action required"
                  : "All current"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Paid This Month
              </Typography>
              <Typography variant="h5" component="h2" color="success.main">
                {formatCurrency(paymentSummary?.totalAmountPaid || 0)}
              </Typography>
              <Typography variant="body2">
                {paymentSummary?.paidPayments || 0} payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Account Status
              </Typography>
              <Chip
                label={
                  paymentSummary?.canBookTrucks
                    ? "Good Standing"
                    : "Payment Required"
                }
                color={paymentSummary?.canBookTrucks ? "success" : "error"}
                variant="outlined"
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {paymentSummary?.canBookTrucks
                  ? "Can book trucks"
                  : "Cannot book trucks"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warning for overdue payments */}
      {!paymentSummary?.canBookTrucks && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Account Suspended</Typography>
          You have overdue payments. Please settle all outstanding payments to
          resume booking services.
        </Alert>
      )}

      {/* Payments Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment History
          </Typography>

          {paymentSummary?.payments?.length === 0 ? (
            <Alert
              severity="info"
              action={
                <Button
                  color="primary"
                  size="small"
                  onClick={generatePaymentsFromDeliveries}
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={16} /> : <PaymentIcon />
                  }
                >
                  {loading ? "Generating..." : "Generate Payments"}
                </Button>
              }
            >
              <Typography variant="body1" sx={{ mb: 1 }}>
                {paymentSummary?.hasDeliveriesWithoutPayments
                  ? `Found ${paymentSummary.deliveriesFound} deliveries without payment records.`
                  : "No payment records found for your account."}
              </Typography>
              <Typography variant="body2">
                {paymentSummary?.hasDeliveriesWithoutPayments
                  ? "Click the button to generate payment records from your existing deliveries."
                  : "If you have existing deliveries, click the button to generate payment records from them."}
              </Typography>
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>Delivery ID</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Days Until Due</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentSummary?.payments?.map((payment) => {
                    const daysUntilDue = getDaysUntilDue(payment.dueDate);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {payment.deliveryId}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {payment.metadata?.pickupLocation || "N/A"} →{" "}
                            {payment.metadata?.deliveryAddress || "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            {formatCurrency(payment.amount)}
                          </Typography>
                          {payment.transactionFee > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              Fee: {formatCurrency(payment.transactionFee)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(payment.dueDate)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Delivery: {formatDate(payment.deliveryDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getPaymentStatusIcon(
                              payment.status,
                              payment.dueDate,
                            )}
                            label={
                              payment.status.charAt(0).toUpperCase() +
                              payment.status.slice(1)
                            }
                            color={getPaymentStatusColor(
                              payment.status,
                              payment.dueDate,
                            )}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {payment.status === "pending" &&
                            daysUntilDue !== null && (
                              <Typography
                                variant="body2"
                                color={
                                  daysUntilDue <= 5
                                    ? "error"
                                    : daysUntilDue <= 10
                                      ? "warning.main"
                                      : "textSecondary"
                                }
                              >
                                {daysUntilDue > 0
                                  ? `${daysUntilDue} days`
                                  : `${Math.abs(daysUntilDue)} days overdue`}
                              </Typography>
                            )}
                          {payment.status === "paid" && payment.paidAt && (
                            <Typography variant="body2" color="success.main">
                              Paid {formatDate(payment.paidAt)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.status === "pending" ||
                          payment.status === "overdue" ? (
                            <Box>
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<PaymentIcon />}
                                onClick={() => handlePayNow(payment)}
                                disabled={processingPayment}
                                sx={{ mb: 1, mr: 1 }}
                              >
                                Pay Now
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<LaunchIcon />}
                                onClick={() => createPaymentLink(payment)}
                                disabled={processingPayment}
                              >
                                Payment Link
                              </Button>
                            </Box>
                          ) : payment.status === "paid" ? (
                            <Tooltip title="Payment completed">
                              <IconButton color="success">
                                <ReceiptIcon />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={paymentFormOpen}
        onClose={() => !processingPayment && setPaymentFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            {paymentSteps[paymentStep]}
            <IconButton
              onClick={() => !processingPayment && setPaymentFormOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Stepper activeStep={paymentStep} alternativeLabel>
              {paymentSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {processingPayment && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Processing payment...
              </Typography>
            </Box>
          )}

          {paymentStep === 0 && renderPaymentMethodSelection()}
          {paymentStep === 1 && renderPaymentForm()}
          {paymentStep === 2 && (
            <Box textAlign="center" py={3}>
              <CircularProgress size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Processing secure payment...
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Please do not close this window
              </Typography>
            </Box>
          )}
        </DialogContent>
        {paymentStep === 1 && (
          <DialogActions>
            <Button
              onClick={() => {
                setPaymentStep(0);
                setPaymentMethod("");
              }}
              disabled={processingPayment}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handlePaymentSubmit}
              disabled={processingPayment}
              sx={{ bgcolor: "#27ae60", "&:hover": { bgcolor: "#219150" } }}
            >
              Proceed to Pay {formatCurrency(selectedPayment?.amount || 0)}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
      >
        <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
          <CheckCircleIcon
            sx={{ fontSize: 60, color: "success.main", mb: 1 }}
          />
          <Typography variant="h5">Payment Successful!</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography align="center">
            Your payment has been processed successfully. The receipt has been
            sent to your email.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => setPaymentDialogOpen(false)}
            sx={{ minWidth: 120 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PaymentManagement;
