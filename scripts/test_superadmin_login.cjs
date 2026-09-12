async function testLogin() {
  try {
    const res = await fetch("http://localhost:4000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "wasimhavaldar70@gmail.com",
        password: "wasimhavaldar70"
      })
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    // Also test accessing Super Admin Dashboard endpoint with this token
    if (data.data?.token) {
      const dashRes = await fetch("http://localhost:4000/api/v1/superadmin/dashboard", {
        headers: { Authorization: `Bearer ${data.data.token}` }
      });
      const dashData = await dashRes.json();
      console.log("\nSuper Admin Dashboard Status:", dashRes.status);
      console.log("Total Gyms:", dashData.data?.total_gyms);
      console.log("MRR:", dashData.data?.monthly_recurring_revenue);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testLogin();
