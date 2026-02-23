import React from "react";
import { Grid, Card, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Cog from "../../../assets/images/Icon_cog.png";
import { GlobalVar } from "common/GlobalVar";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";

const PutHome = () => {
  const navigate = useNavigate();
  const storeType = GlobalVar.getStoreType();
  const storeTypeTrans = getStoreTypeTrans(storeType);

  const putMenus = [
    { title: "Create", path: "" },
    { title: "Execute", path: "/put/execute" },
  ];

  return (
    <Box p={2}>
      <Box display="flex" alignItems="baseline" gap={1}>
        {/* storeTypeTrans + underline */}
        <Box display="inline-block">
          <Typography variant="h3" color="bold">
            {storeTypeTrans}
          </Typography>
          <Box
            sx={{
              width: "100%",
              height: "5px",
              backgroundColor: "#FFA726",
              borderRadius: "4px",
              mt: "12px",
            }}
          />
        </Box>

        {/* Put */}
        <Typography variant="h3" color="bold">
          - Put
        </Typography>
      </Box>

      <Box mt={3}>
        <Grid container spacing={4}>
          {putMenus.map((item, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                onClick={() => navigate(item.path)}
                sx={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  borderRadius: "26px",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0px 6px 15px rgba(0,0,0,0.2)",
                    transition: "all 0.3s ease",
                  },
                }}
              >
                <Box
                  component="img"
                  src={Cog}
                  alt="Put Icon"
                  sx={{ width: 100, height: 100, mb: 1 }}
                />
                <Typography variant="h5">{item.title}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default PutHome;
