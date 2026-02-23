import React, { useState } from "react";
import { Grid, FormControlLabel, Checkbox } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";
import bgImage from "assets/images/wcs.jpg";
import UserApi from "../../../api/UserAPI";
import { GlobalVar } from "../../../common/GlobalVar";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import { StyledMenuItem, StyledSelect } from "common/Global.style";
import { StoreType } from "common/dataMain";

function LabLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [storeType, setStoreType] = useState("WCS"); // ✅ default WCS

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const response = await UserApi.login(username, password, storeType);
      if (response.isCompleted && !response.isError) {
        const data = response.data;
        const token = data.token;
        const userID = data.user_id;
        const userName = data.username;
        const role = data.role_code;
        const McCodes = data.mc_codes;

        if (token && userID && userName) {
          GlobalVar.setToken(token);
          GlobalVar.setUserId(userID);
          GlobalVar.setRole(role);
          GlobalVar.setUsername(userName);
          GlobalVar.setMcCodes(McCodes);
          GlobalVar.setStoreType(storeType || "WCS");

          navigate("/home");
        } else {
          setErrorMessage("Login Failed: Incomplete Information");
        }
        //console.log("UserID:", data.user_id);
      } else {
        setErrorMessage("Login Failed: Invalid Username or Password");
      }
    } catch (err) {
      setErrorMessage("An error occurred during login.");
      console.error(err);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "#fff",
    },
  };

  return (
    <IllustrationLayout
      title="Sign In"
      // description="(optional subtitle)"
      illustration={bgImage}
    >
      <MDBox component="form" role="form" onSubmit={handleLogin}>
        <Grid container direction="column" spacing={2}>
          {/* Username */}
          <Grid item>
            <MDInput
              fullWidth
              label="" // ให้เป็น placeholder แบบในรูป
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={inputSx}
            />
          </Grid>

          {/* Password */}
          <Grid item>
            <MDInput
              fullWidth
              label=""
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={inputSx}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          </Grid>

          {/* Store Type */}
          <Grid item>
            <StyledSelect
              fullWidth
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
              displayEmpty
              sx={{
                borderRadius: "12px",
                backgroundColor: "#fff",
                height: 46,
              }}
            >
              {/* ถ้าไม่เลือกอะไร = WCS */}
              <StyledMenuItem value="WCS">
                WCS (All Store)
              </StyledMenuItem>

              {StoreType.filter(t => t.value !== "WCS").map((t) => (
                <StyledMenuItem key={t.value} value={t.value}>
                  {t.text}
                </StyledMenuItem>
              ))}
            </StyledSelect>
          </Grid>

          {/* Remember me */}
          <Grid item>
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  size="small"
                />
              }
              label={
                <MDTypography variant="button" color="text" sx={{ opacity: 0.9 }}>
                  Remember me
                </MDTypography>
              }
              sx={{ ml: 0.4 }}
            />
          </Grid>

          {/* Login button */}
          <Grid item sx={{ display: "flex", justifyContent: "center" }}>
            <MDButton
              size="large"
              type="submit"
              sx={{
                width: 300,  // ✅ ลดความกว้าง (ปรับตัวเลขได้)
                color: "#fff",                 // ✅ ตัวหนังสือสีขาว
                height: 46,
                borderRadius: "24px",
                textTransform: "none",
                fontWeight: 500,
                fontSize: 16,
                background: "linear-gradient(180deg,#4f85ff,#2f66f5)",
                boxShadow: "0 8px 18px rgba(47,102,245,0.35)",
                "&:hover": {
                  background: "linear-gradient(180deg,#4a7df2,#2b5de2)",
                },
              }}
            >
              Log in
            </MDButton>
          </Grid>


          {/* Error */}
          {errorMessage && (
            <Grid item>
              <MDTypography variant="caption" color="error">
                {errorMessage}
              </MDTypography>
            </Grid>
          )}
        </Grid>
      </MDBox>
    </IllustrationLayout>
  );
}

export default LabLogin;
