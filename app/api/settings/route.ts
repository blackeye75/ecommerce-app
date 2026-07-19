import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/models";
import { settingsSchema } from "@/lib/validations/settings";
import { requireAdmin } from "@/lib/middleware/requireAdmin";
import { logAdminAction, getClientIp } from "@/lib/middleware/logAdminAction";
import { getSiteSettings } from "@/lib/site-settings";

// Public — the storefront reads branding/nav/footer/etc. from here. It's all
// content meant to be shown to visitors anyway, so there's nothing sensitive.
export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Get settings error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// Admin only — replaces the editable fields of the singleton settings doc.
// The form posts the entire object, so we $set the whole validated payload.
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();

    const before = await SiteSettings.findOne({ singletonKey: "site" }).lean();

    const updated = await SiteSettings.findOneAndUpdate(
      { singletonKey: "site" },
      { $set: parsed.data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    await logAdminAction({
      adminId: admin.id,
      action: "SETTINGS_UPDATE",
      targetType: "Settings",
      changes: {
        // Store a compact before/after of the top-level sections that changed,
        // so the activity log stays readable rather than dumping the whole blob.
        before: before ? summarize(before) : null,
        after: summarize(parsed.data),
      },
      ipAddress: getClientIp(req),
    });

    const settings = await getSiteSettings();
    return NextResponse.json({ settings, saved: !!updated });
  } catch (err) {
    console.error("Update settings error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/** Small helper: keep the audit-log diff to store name + section keys, not megabytes of content. */
function summarize(obj: any) {
  return {
    storeName: obj?.brand?.storeName,
    metaTitle: obj?.seo?.metaTitle,
    primaryColor: obj?.theme?.primaryColor,
    currencySymbol: obj?.commerce?.currencySymbol,
    shippingFee: obj?.commerce?.shippingFee,
    navLinkCount: obj?.header?.navLinks?.length ?? 0,
    footerColumnCount: obj?.footer?.columns?.length ?? 0,
    bannerCount: obj?.home?.banners?.length ?? 0,
  };
}
