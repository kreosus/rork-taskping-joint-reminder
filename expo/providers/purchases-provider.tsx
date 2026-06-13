import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from "react-native-purchases";

const ENTITLEMENT_ID = "premium";
const OFFERING_ID = "default";

export const FREE_LIMITS = {
  selfTasks: 5,
  partnerTasks: 3,
  medications: 2,
  notificationRepeats: 5,
} as const;

function getRevenueCatKey(): string | undefined {
  if (__DEV__ || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }

  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

const revenueCatKey = getRevenueCatKey();

if (revenueCatKey) {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: revenueCatKey });
} else {
  console.log("[purchases] Missing RevenueCat public API key for", Platform.OS);
}

export interface PurchasePlan {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  badge?: string;
  package: PurchasesPackage;
}

function getPackageTitle(pkg: PurchasesPackage): string {
  const identifier = pkg.identifier.toLowerCase();
  if (identifier.includes("annual") || identifier.includes("year")) return "Yearly";
  if (identifier.includes("month")) return "Monthly";
  return pkg.product.title || pkg.identifier;
}

function getPackageSubtitle(pkg: PurchasesPackage): string {
  const identifier = pkg.identifier.toLowerCase();
  if (identifier.includes("annual") || identifier.includes("year")) return "Best value — unlimited nudges all year.";
  if (identifier.includes("month")) return "Unlimited partner nudges, billed monthly.";
  return pkg.product.description || "Unlock premium nudges.";
}

function getPackageBadge(pkg: PurchasesPackage): string | undefined {
  const identifier = pkg.identifier.toLowerCase();
  if (identifier.includes("annual") || identifier.includes("year")) return "Save 50%";
  return undefined;
}

function mapPlans(offering?: PurchasesOffering | null): PurchasePlan[] {
  const packages = offering?.availablePackages ?? [];
  return packages.map((pkg) => ({
    id: pkg.identifier,
    title: getPackageTitle(pkg),
    subtitle: getPackageSubtitle(pkg),
    price: pkg.product.priceString,
    badge: getPackageBadge(pkg),
    package: pkg,
  }));
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const isConfigured = Boolean(revenueCatKey);

  const customerInfoQuery = useQuery({
    queryKey: ["purchases", "customerInfo"],
    queryFn: async () => {
      if (!isConfigured) return null;
      console.log("[purchases] Fetching customer info");
      return Purchases.getCustomerInfo();
    },
  });

  const offeringsQuery = useQuery({
    queryKey: ["purchases", "offerings"],
    queryFn: async () => {
      if (!isConfigured) return null;
      console.log("[purchases] Fetching offerings");
      return Purchases.getOfferings();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (plan: PurchasePlan) => {
      if (!isConfigured) throw new Error("Purchases are not configured yet.");
      console.log("[purchases] Purchasing package", plan.id);
      const result = await Purchases.purchasePackage(plan.package);
      return result.customerInfo;
    },
    onSuccess: (customerInfo: CustomerInfo) => {
      queryClient.setQueryData(["purchases", "customerInfo"], customerInfo);
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (error) => {
      console.log("[purchases] Purchase failed", error);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!isConfigured) throw new Error("Purchases are not configured yet.");
      console.log("[purchases] Restoring purchases");
      return Purchases.restorePurchases();
    },
    onSuccess: (customerInfo: CustomerInfo) => {
      queryClient.setQueryData(["purchases", "customerInfo"], customerInfo);
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (error) => {
      console.log("[purchases] Restore failed", error);
    },
  });

  const currentOffering = offeringsQuery.data?.current ?? offeringsQuery.data?.all?.[OFFERING_ID] ?? null;
  const plans = mapPlans(currentOffering);
  const customerInfo = customerInfoQuery.data ?? null;
  const isPremium = Boolean(customerInfo?.entitlements.active[ENTITLEMENT_ID]);

  return {
    isConfigured,
    plans,
    currentOffering,
    customerInfo,
    isPremium,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    error: customerInfoQuery.error ?? offeringsQuery.error ?? null,
    purchasePlan: purchaseMutation.mutateAsync,
    restorePurchases: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
});
