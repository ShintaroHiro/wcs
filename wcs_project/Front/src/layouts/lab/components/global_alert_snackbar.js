import { useContext } from "react";
import { Snackbar, Paper, IconButton, Typography, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NotificationContext } from "context/NotificationContext";

const GlobalAlertSnackbar = () => {

  const { alertOpen, alertMessages, setAlertOpen } = useContext(NotificationContext);

  return (
    <Snackbar
      open={alertOpen}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        mt: 10,
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: 500,
          borderRadius: "16px",
          padding: 2,
          position: "relative",
          border: "2px solid red",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            color: "red",
            fontWeight: "bold",
            mb: 1,
          }}
        >
          Alert
        </Typography>

        <IconButton
          onClick={() => setAlertOpen(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box>
          {alertMessages.map((msg, index) => (
            <Typography key={index} align="center" sx={{ color: "red" }}>
              {msg}
            </Typography>
          ))}
        </Box>

      </Paper>
    </Snackbar>
  );
};

export default GlobalAlertSnackbar;