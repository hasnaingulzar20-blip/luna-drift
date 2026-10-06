#!/bin/bash
set -e

echo "🌙 Luna Drift — Android Setup"
echo "=============================="

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "⚠️  .env.local not found!"
  echo "   Create it with:"
  echo "   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
  echo "   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo ""
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building web app (static export)..."
npm run build

echo "📱 Adding Android platform (if not already added)..."
if [ ! -d "android" ]; then
  npx cap add android
fi

echo "🔄 Syncing web build to Android..."
npx cap sync android

echo "✅ Done!"
echo ""
echo "Next steps:"
echo "  1. Open in Android Studio:  npx cap open android"
echo "  2. Configure deep links (see ANDROID_SETUP.md Step 7)"
echo "  3. Add Supabase redirect URL: lunadrift://auth/callback"
echo "  4. Run on emulator/device from Android Studio"
echo ""
echo "Full guide: ANDROID_SETUP.md"
