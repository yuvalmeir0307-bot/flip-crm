import { NextRequest, NextResponse } from "next/server";
import { getAllScripts, updateScriptMessage, deleteScript, createScript, resolveMessage } from "@/lib/scripts";
import { sendSMS } from "@/lib/openphone";

export async function GET() {
  try {
    const scripts = await getAllScripts();
    return NextResponse.json(scripts);
  } catch (err) {
    console.error("[scripts] GET error:", err);
    return NextResponse.json({ error: "Failed to load scripts" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, message } = await req.json();
    if (!id || typeof message !== "string") {
      return NextResponse.json({ error: "Missing id or message" }, { status: 400 });
    }
    await updateScriptMessage(id, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scripts] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update script" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteScript(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scripts] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete script" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Test action: send test SMS to Yuval
    if (body.action === "test") {
      const { message } = body;
      if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });
      const resolved = resolveMessage(message, "Test Broker", "Yahav");
      const yuval = process.env.YUVAL_PHONE_NUMBER!;
      const result = await sendSMS(yuval, resolved, yuval);
      return NextResponse.json(result);
    }

    // Create action: add new script step
    if (body.action === "create") {
      const { campaign, step, label, message, delay } = body;
      if (!campaign || !step || !label || !message || !delay) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      await createScript({ campaign, step, label, message, delay });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[scripts] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
