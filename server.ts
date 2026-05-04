import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Firebase imports
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

// Load JSON using fs since ES Modules natively parsing JSON can be tricky depending on Node version
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

// Initialize Firebase for the server
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

let serverAuthenticated = false;

signInAnonymously(auth).then(() => {
  serverAuthenticated = true;
  console.log("Server Firebase Auth connected.");
}).catch((err) => {
  console.error("Server Firebase Auth error:", err);
});

// Google Ads (Basic Auth)
const GOOGLE_ADS_USERNAME = "admin";
const GOOGLE_ADS_PASSWORD = "123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/download/:fileName", async (req, res) => {
    try {
      // Basic Authentication
      const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
      const [login, password] = Buffer.from(b64auth, "base64").toString().split(":");
      
      if (login !== GOOGLE_ADS_USERNAME || password !== GOOGLE_ADS_PASSWORD) {
        res.setHeader("WWW-Authenticate", 'Basic realm="401"');
        res.status(401).send("Authentication required.");
        return;
      }

      if (!serverAuthenticated) {
        res.status(503).send("Server initialization in progress. Retry shortly.");
        return;
      }

      const fileName = req.params.fileName;
      const docId = fileName.replace(/\.xlsx$/, "");

      // 3. Lấy dữ liệu từ Firestore
      const docRef = doc(db, "documents", docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        res.status(404).send("Document not found.");
        return;
      }

      const docInfo = docSnap.data();
      const formData = docInfo.formData;
      if (!formData) {
        res.status(400).send("Invalid document format.");
        return;
      }

      const wb = XLSX.utils.book_new();

      const SHEETS_CONFIG = [
        {
          id: "campaigns",
          name: "CREATE NEW CAMPAIGN",
          columns: [
            "Action", "Campaign status", "Customer ID", "Campaign", "Campaign type",
            "Networks", "Budget", "Budget type", "Bid strategy type", "Bid strategy",
            "Campaign start date", "Campaign end date", "Language", "Location", "Exclusion",
            "Devices", "Label", "Target CPA", "Target ROAS", "EU political ads",
            "Target Impression Share", "Max CPC Bid Limit for Target IS", "Location Goal for Target IS",
            "Tracking template", "Final URL suffix", "Custom parameter", "Viewability vendor",
            "Inventory type", "Campaign subtype"
          ]
        },
        {
          id: "ad_groups",
          name: "CREATE NEW AD GROUP",
          columns: [
            "Action", "Customer ID", "Campaign", "Campaign ID", "Ad group", "Status", "Ad group type", "Max"
          ]
        },
        {
          id: "content_ads",
          name: "Content ads",
          columns: [
            "Action", "Ad status", "Campaign ID", "Customer ID", "Campaign", "Ad group", "Final URL",
            "Headline 1", "Headline 1 position", "Headline 2", "Headline 2 position", "Headline 3", "Headline 3 position",
            "Headline 4", "Headline 4 position", "Headline 5", "Headline 5 position", "Headline 6", "Headline 6 position",
            "Headline 7", "Headline 7 position", "Headline 8", "Headline 8 position", "Headline 9", "Headline 9 position",
            "Headline 10", "Headline 10 position", "Headline 11", "Headline 11 position", "Headline 12", "Headline 12 position",
            "Headline 13", "Headline 13 position", "Headline 14", "Headline 14 position", "Headline 15", "Headline 15 position",
            "Description 1", "Description 1 position", "Description 2", "Description 2 position",
            "Description 3", "Description 3 position", "Description 4", "Description 4 position",
            "Path 1", "Path 2", "Mobile final URL", "Tracking template", "Final URL suffix", "Custom parameter",
            "Status", "Status reasons", "Ad strength", "Ad strength improvements", "Ad type",
            "Clicks", "Impr.", "CTR", "Currency code", "Avg. CPC", "Cost"
          ]
        }
      ];

      // -- Sheet 1: CREATE NEW CAMPAIGN --
      const wsCampaignData = [{
        "Action": "Add",
        "Campaign status": "",
        "Campaign": formData.campaign,
        "Campaign type": formData.campaignType || "Search",
        "Networks": "Google Search",
        "Budget": formData.budget,
        "Budget type": "Daily",
        "Bid strategy type": "Manual CPC",
        "Language": formData.language || "en",
        "Location": formData.location || "",
        "EU political ads": "No"
      }];
      const wsCampaign = XLSX.utils.json_to_sheet(wsCampaignData, { header: SHEETS_CONFIG[0].columns });
      XLSX.utils.book_append_sheet(wb, wsCampaign, "CREATE NEW CAMPAIGN");

      // -- Sheet 2: CREATE NEW AD GROUP --
      const wsAdGroupData = [{
        "Action": "Add",
        "Status": "Enabled",
        "Campaign": formData.campaign,
        "Ad group": "Ad group 1",
        "Ad group type": "Standard"
      }];
      const wsAdGroup = XLSX.utils.json_to_sheet(wsAdGroupData, { header: SHEETS_CONFIG[1].columns });
      XLSX.utils.book_append_sheet(wb, wsAdGroup, "CREATE NEW AD GROUP");

      // -- Sheet 3: Content ads --
      const adsRow: any = {
        "Action": "Add",
        "Ad status": "Enabled",
        "Status": "Pending",
        "Ad strength": "Good",
        "Ad type": "Responsive search ad",
        "Campaign": formData.campaign || "",
        "Ad group": "Ad group 1",
        "Final URL": formData.finalUrl || "",
        "Path 1": formData.path1 || "",
        "Path 2": formData.path2 || "",
      };

      if (formData.headlines) {
        formData.headlines.forEach((hl: string, i: number) => {
          if (hl) adsRow[`Headline ${i + 1}`] = hl;
        });
      }

      if (formData.descriptions) {
        formData.descriptions.forEach((desc: string, i: number) => {
          if (desc) adsRow[`Description ${i + 1}`] = desc;
        });
      }

      const wsAds = XLSX.utils.json_to_sheet([adsRow], { header: SHEETS_CONFIG[2].columns });
      XLSX.utils.book_append_sheet(wb, wsAds, "VBBBBBBB");
      

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });


      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${formData.campaign || "google_ads_data"}.xlsx"`);
      res.send(buffer);
      
    } catch (error) {
      console.error("Lỗi xuất file Excel:", error);
      res.status(500).send("Internal Server Error.");
    }
  });


  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {

    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
