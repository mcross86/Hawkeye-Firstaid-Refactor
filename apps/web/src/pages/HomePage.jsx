import { Box, Button, Card, CardContent, Grid2 as Grid, Stack, Typography } from "@mui/material";

function NavTile({ title, onClick, variant = "outlined" }) {
  return (
    <Card variant={variant} sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2, height: "100%" }}>
        <Stack spacing={1} height="100%" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={800} textAlign="center">
              {title}
            </Typography>
          </Box>
          <Box>
            <Button fullWidth variant="contained" onClick={onClick}>
              Open
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HomePage({ onGoToDriverApp, onGoToCustomers, onGoToItems, onGoToPurchaseOrders }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={800} textAlign="center">
        Hawkeye Driver Apps
      </Typography>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12 }}>
          <NavTile title="Customer Replen Order" onClick={onGoToDriverApp} variant="outlined" />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <NavTile title="Customers" onClick={onGoToCustomers} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NavTile title="Items" onClick={onGoToItems} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NavTile title="Purchase Order List" onClick={onGoToPurchaseOrders} />
        </Grid>
      </Grid>
    </Stack>
  );
}

export default HomePage;
