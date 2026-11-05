"use client";

import AuthGate from "./components/AuthGate"
import React, { useEffect, useState } from "react";
import { 
  Home as HomeIcon, 
  Clock, 
  CreditCard, 
  LockKeyhole,
  User, 
  Send, 
  ArrowDownLeft,
  ArrowRight,
  WalletCards,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  PiggyBank,
  Repeat, 
  Plus, 
  Search, 
  Bell, 
  Eye, 
  EyeOff, 
  Check, 
  ArrowLeft, 
  Delete, 
  ShieldCheck, 
  ShieldAlert,
  Sparkles,
  Copy
} from "lucide-react";
import { Interface } from "readline";

interface Bank {
  id: number;
  name: string;
  code: string;
}

interface Recipient {
  name: string;
  tag: string;
  bank?: string;
  avatar?: string;
  accountNumber?: string;
  bankcode?:string;
  bankName?: string;
  recipientCode?: string;
}

interface Budget {
  id: string | number;
  category: string;
  limit: number;
  spent: number;
}

interface Transaction {
  id: string | number;
  name: string;
  type: string;
  time: string;
  amount: number;
  tag: string;
  reference?:string;
  status?: string;
  method?: string;
  category?: string;
}

interface Bill {
  id: string | number;
  category: string;
  provider: string;
  accountNumber: string;
  amount: number;
  dueDate: string;
  status: "Pending" | "Paid";
}

interface subscription {
  id: string | number;
  name: string;
  provider: string;
  category: string;
  amount: number;
  billingCycle: "Monthly" | "Yearly";
  nextPayment: string;
  status: "Active" | "Paused" | "Cancelled";
}

interface Savings {
  id: string | number;
  name: string;
  amount: number;
  targetAmount: number;
  interestRate: number;
  lockPeriodDays: number;
  startDate: string;
  maturityDate: string;
  status: "Active" | "Matured" | "Withdrawn";
}

interface SecurityAlert {
  id: string | number;
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High";
  time: string;
  status: "Open" | "Resolved";
  transactionReference?: string;
  transactionAmount?: number;
  transactionType?: string;
  transactionName?: string;
}


interface AzaCard {
  id: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardholderName: string;
  type: string;
  status: string;
  spendingLimit: number;
}

type AzaUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tag: string;
  isVerified: boolean;
  onboardingComplete: boolean;
};

type AiCfoMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type AiCfoFinancialSnapshot = {
  balance: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  netTransactionFlow: number;
  
  dailyBrief: {
    date: string;
    yesterday: {
      spending: number;
      moneyIn: number;
      transactionCount: number;
      spendingCount: number;
      moneyInCount: number;
      topSpendingCategory: {
        category: string;
        amount: number;
        percentage: number;
      } | null;
      largestSpending: {
        amount: number;
        description: string | null;
        recipient: string | null;
      } | null;
      spendingCategories: {
        category: string;
        amount: number;
        percentage: number;
      }[];
    };
  };

  totalSpending: number;
  spendingCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];

  topSpendingCategory: {
    category: string;
    amount: number;
  }
  lockedSavings: number;
  rainyDaySavings: number;
  totalSavings: number;
  recentTransactionCount: number;
  completedTransactionCount: number;
  card: {
    status: string;
    type: string;
    spendingLimit: number;
  } | null;
  lockedSavingsMaturity: string | null;
};

type AiCfoFinancialAssessment = {
  balanceStatus:
    | "LOW"
    | "WATCH"
    | "HEALTHY";

  spendingStatus:
    | "NO_SPENDING_DATA"
    | "HIGH"
    | "ACTIVE";

  savingsStatus:
    | "START"
    | "BUILD_RAINY_DAY"
    | "BUILDING";

  securityStatus: string;

  priority:
    | "BALANCE"
    | "SPENDING"
    | "RAINY_DAY"
    | "MAINTAIN";

  spendingInsight: string;

  balanceLabel:
    | "LOW"
    | "WATCH"
    | "HEALTHY";

  spendingLabel:
    | "LOW"
    | "MODERATE"
    | "HIGH"
    | "NO_DATA";

  savingsLabel:
    | "START"
    | "BUILDING"
    | "ESTABLISHED";

  overallStatus:
    | "ATTENTION"
    | "WATCH"
    | "STABLE";

  overallMessage: string;

  todayFocus: {
    title: string;
    message: string;
    type:
      | "BALANCE"
      | "SPENDING"
      | "RAINY_DAY"
      | "MAINTAIN";
  }
  summary: {
    availableBalance: number;
    totalSpending: number;
    rainyDaySavings: number;
    lockedSavings: number;
    totalSavings: number;
  };
};

function AzaApp({ user }: { user: AzaUser }) {
  const [activeTab, setActiveTab] = useState<"home" | "activity" | "cards" | "profile"  | "ai_cfo">("home");
  const [cardFrozen, setCardFrozen] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [azaCard, setAzaCard] = useState<AzaCard | null>(null);
  const [cardSpendingLimit, setCardSpendingLimit] = useState(500000);
  const [cardSpentThisMonth, setCardSpentThisMonth] = useState(0);
  const [cardPaymentAmount, setCardPaymentAmount] = useState("");
  const [cardPaymentMerchant, setCardPaymentMerchant] = useState("");
  const [cardPaymentError, setCardPaymentError] = useState("");
  const [editingCardLimit, setEditingCardLimit] = useState(false);
  const [cardLimitInput, setCardLimitInput] = useState("");
  const [cardLimitError, setCardLimitError] = useState("");
  const [monthlyBudget, setMonthlyBudget] =  useState(1000000);
  const [budgetSpent, setBudgetSpent] =  useState(0);
  const [budgetCategory, setBudgetCategory] =  useState("Food & Dining");
  const [newBudgetCategory, setNewBudgetCategory] =  useState("");
  const [bills, setBills] = useState<Bill[]>([
    {
      id: 1,
      category: "Electricity",
      provider: "Ikeja Electric",
      accountNumber: "1234567890",
      amount: 35000,
      dueDate: "Sep 15, 2026",
      status: "Pending",
    },
    {
      id: 2,
      category: "Internet",
      provider: "MTN Fibre",
      accountNumber: "MTN-458921",
      amount: 25000,
      dueDate: "Sep 18, 2026",
      status: "Pending",
    },
    {
      id: 3,
      category: "TV",
      provider: "DSTV",
      accountNumber: "4123456789",
      amount: 18500,
      dueDate: "Sep 20, 2026",
      status: "Pending",
    }, 
  ]);

  const [subscriptions, setSubscriptions] = useState<subscription[]>([
    {
      id: 1,
      name: "Netflix",
      provider: "Netflix",
      category: "Entertainment",
      amount: 15000,
      billingCycle: "Monthly",
      nextPayment: "Sep 22, 2026",
      status: "Active",
    },
    {
      id: 2,
      name: "Spotify Premium",
      provider: "Spotify",
      category: "Entertainment",
      amount: 5000,
      billingCycle: "Monthly",
      nextPayment: "Sep 25, 2026", 
      status: "Active",
    },
    {
      id: 3,
      name: "Google One",
      provider: "Google",
      category: "Technology",
      amount: 2500,
      billingCycle: "Monthly",
      nextPayment: "Sep 28, 2026",
      status: "Active",
    },
  ]);
  const [selectedSubscription, setSelectedSubscription] = useState<subscription | null>(null);
  const [securityAlerts, setSecurityAlert] = useState<SecurityAlert[]>([
  {
    id: 1,
    title: "Large transaction detected",
    description:
      "A transaction above your normal spending pattern was detected.",
    severity: "Medium",
    time: "Today 10:24 AM",
    status: "Open",
  },
  {
    id: 2,
    title: "New payment activity",
    description:
      "A recent payment was made through your AZA virtual card.",
    severity: "Low",
    time: "Yesterday 6:42 PM",
    status: "Open",
  },
]);

const [accountSecurityStatus, setAccountSecurityStatus] =
  useState<"Protected" | "Review Required">("Protected");

const [selectedSecurityAlert, setSelectedSecurityAlert] =
  useState<SecurityAlert | null>(null);
  const [securityActionMessage, setSecurityActionMessage] = useState("");
  const [subscriptionPaymentAmount, setSubscriptionPaymentAmount] = useState("");
  const [subscriptionPaymentPin, setSubscriptionPaymentPin] = useState("");
  const [subscriptionPaymentError, setSubscriptionPaymentError] = useState("");
  const [lastSubscriptionPaymentRef, setLastSubscriptionPaymentRef] = useState("");
  const [subscriptionName, setSubscriptionName] = useState("");
  const [subscriptionProvider, setSubscriptionProvider] = useState("");
  const [subscriptionCategory, setSubscriptionCategory] = useState("");
  const [subscriptionAmount, setSubscriptionAmount] = useState("");
  const [subscriptionBillingCycle, setSubscriptionBillingCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [subscriptionNextPayment, setSubscriptionNextPayment] = useState("");
  const [subscriptionError, setSubscriptionError] = useState("");
  const [savings, setSavings] = useState<Savings | null>(null);
  const [rainyDaySavings, setRainyDaySavings] = useState<{
    id: string;
    amount: number;
    status: string;
    reference: string;
    createdAt: string;
  }[]
  >([]);
  const rainyDaySavingsTotal = rainyDaySavings.reduce((total, savings) => total + savings.amount,0);
  const [savingsAmount, setSavingsAmount] = useState("");
  
  const [savingsError, setSavingsError] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billProvider, setBillProvider] = useState("");
  const [billCategory, setBillCategory] = useState("");
  const [billAccountNumber, setBillAccountNumber] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billCreateError, setBillCreateError] = useState("");
  const [billPaymentError, setBillPaymentError] = useState("");
  const [billPaymentAmount, setBillPaymentAmount] = useState("");
  const [billPaymentPin, setBillPaymentPin] = useState("");
  const [lastBillPaymentRef, setLastBillPaymentRef] = useState("");
  const [sendCategory, setSendCategory] = useState("");
  const [budgetCategoryLimit, setBudgetCategoryLimit] =  useState(200000);
  const [budgetCategorySpent, setBudgetCategorySpent] =  useState(0);
  const [showBudgetDetails, setBudgetDetails] =  useState(false);
  const [editingBudget, setEditingBudget] =  useState(false);
  const [budgetInput, setBudgetInput] =  useState("");
  const [budgetError, setBudgetError] =  useState("");
  const [newBudgetLimit, setNewBudgetLimit] = useState("");
  const [flowState, setFlowState] = useState<"dashboard" | "send_input" | "send_pin" | "savings" | "savings_create" | "send_success" |"topup_method" | "topup_input" | "topup_pin" | "topup_success" | "receive_input" | "receive_success" | "transaction_details" | "card_details" | "card_payment" | "card_payment_success" | "budget_details" | "budget_edit" | "budget_create" | "bills" | "bill_create" |"bill_details" | "bill_payment" | "bill_pin" | "bill_success"| "subscription" | "subscription_details" | "subscription_create" | "subscription_success" | "subscription_payment" | "subscription_payment_pin" | "subscription_payment_success" | "security" | "security_alert">("dashboard");

  const [balance, setBalance] = useState(8450000);

  const [aiCfoMessages, setAiCfoMessages] = useState<AiCfoMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
       "I'm your AZA AI CFO. Ask me about your balance, budget, savings, or what you should focus on today",
      
    },
  ]);

  type DailyBrief = {
  date: string;
  greeting: string;
  balance: number;
  yesterday: {
    spending: number;
    moneyIn: number;
    transactionCount: number;
    spendingCount: number;
    moneyInCount: number;
    spendingCategories: {
      category: string;
      amount: number;
      percentage: number;
    }[];
    topSpendingCategory: {
      category: string;
      amount: number;
      percentage: number;
    } | null;
    largestSpending: {
      amount: number;
      description: string | null;
      recipient: string | null;
    } | null;
  };
  savings: {
    rainyDay: number;
    locked: number;
    total: number;
  };
  focus: {
    type: "BALANCE" | "SPENDING" | "RAINY_DAY" | "MAINTAIN";
    title: string;
    message: string;
  };
};

const [dailyBrief, setDailyBrief] =
  useState<DailyBrief | null>(null);

const [dailyBriefLoading, setDailyBriefLoading] =
  useState(false);

  const [aiCfoInput, setAiCfoInput] = useState("");
  const [aiCfoLoading, setAiCfoLoading] = useState(false);
  const [notificationPreferences, setNotificationPreferences] =
  useState({
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
  });

const [notificationPreferencesLoading, setNotificationPreferencesLoading] =
  useState(false);

const [notificationPreferencesSaving, setNotificationPreferencesSaving] =
  useState(false);

const [notificationPreferencesMessage, setNotificationPreferencesMessage] =
  useState("");

const loadNotificationPreferences = async () => {
  try {
    setNotificationPreferencesLoading(true);

    const response = await fetch(
      "/api/ai-cfo/notifications/preferences"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to load notification preferences."
      );
    }

    setNotificationPreferences(data.preferences);
  } catch (error) {
    console.error(
      "NOTIFICATION_PREFERENCES_LOAD_ERROR:",
      error
    );
  } finally {
    setNotificationPreferencesLoading(false);
  }
};

const updateNotificationPreference = async (
  key:
    | "emailNotifications"
    | "smsNotifications"
    | "whatsappNotifications",
  value: boolean
) => {
  try {
    setNotificationPreferencesSaving(true);
    setNotificationPreferencesMessage("");

    const response = await fetch(
      "/api/ai-cfo/notifications/preferences",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [key]: value,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to update notification preferences."
      );
    }

    setNotificationPreferences(data.preferences);

    setNotificationPreferencesMessage(
      "Notification preferences updated."
    );
  } catch (error) {
    console.error(
      "NOTIFICATION_PREFERENCES_UPDATE_ERROR:",
      error
    );

    setNotificationPreferencesMessage(
      error instanceof Error
        ? error.message
        : "Failed to update notification preferences."
    );
  } finally {
    setNotificationPreferencesSaving(false);
  }
};
  const [aiCfoSnapshot, setAiCfoSnapshot] = useState<AiCfoFinancialSnapshot | null>(null);

  const [aiCfoAssessment, setAiCfoAssessment] =
  useState<AiCfoFinancialAssessment | null>(null);

  type AiCfoAction = {
  type:
    | "security"
    | "spending"
    | "rainy_day"
    | "locked";

  title: string;
  description: string;
};



const loadAiCfoSnapshot = async () => {
  try {
    const response = await fetch("/api/ai-cfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        message: "Give me a summary of my finances",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Unable to load AI CFO snapshot."
      );
    }

    if (data.financialSnapshot) {
      setAiCfoSnapshot(data.financialSnapshot);
    }

    if (data.financialAssessment) {
      setAiCfoAssessment(data.financialAssessment);
    }
  } catch (error) {
    console.error("AI_CFO_SNAPSHOT_ERROR:", error);
  }
};

const loadDailyBrief = async () => {
  if (dailyBriefLoading) return;

  setDailyBriefLoading(true);

  try {
    const response = await fetch("/api/ai-cfo/daily-brief", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Unable to load daily brief."
      );
    }

    if (data.brief) {
      setDailyBrief(data.brief);
    }
  } catch (error) {
    console.error("DAILY_BRIEF_ERROR:", error);
  } finally {
    setDailyBriefLoading(false);
  }
};

  const handleAiCfoMessage = async (messageOverride?: string) => {
  const message = (messageOverride ?? aiCfoInput).trim();

  if (!message || aiCfoLoading) return;

  const userMessage: AiCfoMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    content: message,
  };

  setAiCfoMessages((current) => [...current, userMessage]);
  setAiCfoInput("");
  setAiCfoLoading(true);

  try {
    const response = await fetch("/api/ai-cfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        message,
      }),
    });

    

const updateNotificationPreference = async (
  key:
    | "emailNotifications"
    | "smsNotifications"
    | "whatsappNotifications",
  value: boolean
) => {
  try {
    setNotificationPreferencesSaving(true);
    setNotificationPreferencesMessage("");

    const response = await fetch(
      "/api/ai-cfo/notifications/preferences",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [key]: value,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to update notification preferences."
      );
    }

    setNotificationPreferences(data.preferences);

    setNotificationPreferencesMessage(
      "Notification preferences updated."
    );
  } catch (error) {
    console.error(
      "NOTIFICATION_PREFERENCES_UPDATE_ERROR:",
      error
    );

    setNotificationPreferencesMessage(
      error instanceof Error
        ? error.message
        : "Failed to update notification preferences."
    );
  } finally {
    setNotificationPreferencesSaving(false);
  }
};






    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI CFO request failed");
    }

    if (data.financialSnapshot) {
      setAiCfoSnapshot(data.financialSnapshot);
    }

    const assistantMessage: AiCfoMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: data.reply,
    };

    setAiCfoMessages((current) => [...current, assistantMessage]);
  } catch (error) {
    console.error("AI_CFO_ERROR:", error);

    setAiCfoMessages((current) => [
      ...current,
      {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "I couldn't process that right now. Please try again in a moment.",
      },
    ]);
  } finally {
    setAiCfoLoading(false);
  }
};

useEffect(() => {
  async function loadAccount() {
    try {
      const response = await fetch("/api/account", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("ACCOUNT_LOAD_ERROR:", await response.text());
        return;
      }

      const data = await response.json();

      if (data.account) {
        setBalance(Number(data.account.balance));
      }
    } catch (error) {
      console.error("ACCOUNT_LOAD_ERROR:", error);
    }
  }

  loadAccount();
}, []);



useEffect(() => {
  if (activeTab === "ai_cfo") {
    loadAiCfoSnapshot();
    loadDailyBrief();
  }
}, [activeTab]);

useEffect(() => {
  if (
    flowState === "dashboard" &&
    activeTab === "profile"
  ) {
    loadNotificationPreferences();
  }
}, [activeTab, flowState]);


useEffect(() => {
  async function loadTransactions() {
    try {
      const response = await fetch("/api/transactions", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("TRANSACTIONS_LOAD_ERROR:", await response.text());
        return;
      }

      const data = await response.json();

      const loadedTransactions: Transaction[] = data.transactions.map(
        (transaction: {
          id: string;
          type: string;
          amount: string;
          status: string;
          description: string | null;
          recipient: string | null;
          reference: string;
          createdAt: string;
        }) => ({
          id: transaction.id,
          name:
            transaction.description?.replace(/^Transfer to /, "") ||
            transaction.recipient ||
            transaction.type,
          type: transaction.type,
          time: new Date(transaction.createdAt).toLocaleString("en-NG", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          }),
          amount: Number(transaction.amount),
          tag: transaction.recipient || "",
          reference: transaction.reference,
          status: transaction.status,
        })
      );

      setTransactions(loadedTransactions);
    } catch (error) {
      console.error("TRANSACTIONS_LOAD_ERROR:", error);
    }
  }

  loadTransactions();
}, []);

useEffect(() => {
  async function loadSavings() {
    try {
      const response = await fetch("/api/locked-savings", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error(
          "SAVINGS_LOAD_ERROR:",
          await response.text()
        );
        return;
      }

      const data = await response.json();

      if (!data.savings) {
        setSavings(null);
        return;
      }

      const loadedSavings: Savings = {
        id: data.savings.id,
        name: "AZA Locked Savings",
        amount: Number(data.savings.amount),
        targetAmount: Number(data.savings.targetAmount),
        interestRate: Number(data.savings.interestRate),
        lockPeriodDays: data.savings.lockPeriodDays,
        startDate: new Date(
          data.savings.startDate
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        maturityDate: new Date(
          data.savings.maturityDate
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: data.savings.status === "ACTIVE"
          ? "Active"
          : data.savings.status,
      };

      setSavings(loadedSavings);
    } catch (error) {
      console.error("SAVINGS_LOAD_ERROR:", error);
    }
  }

  loadSavings();
}, []);

useEffect(() => {
  async function loadRainyDaySavings() {
    try {
      const response = await fetch("/api/savings", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error(
          "RAINY_DAY_SAVINGS_LOAD_ERROR:",
          await response.text()
        );
        return;
      }

      const data = await response.json();

      if (!Array.isArray(data.savings)) {
        setRainyDaySavings([]);
        return;
      }

      const loadedRainyDaySavings = data.savings.map(
        (saving: {
          id: string;
          amount: string;
          status: string;
          reference: string;
          createdAt: string;
        }) => ({
          id: saving.id,
          amount: Number(saving.amount),
          status: saving.status,
          reference: saving.reference,
          createdAt: saving.createdAt,
        })
      );

      setRainyDaySavings(loadedRainyDaySavings);
    } catch (error) {
      console.error(
        "RAINY_DAY_SAVINGS_LOAD_ERROR:",
        error
      );
    }
  }

  loadRainyDaySavings();
}, []);

useEffect(() => {
  async function loadCard() {
    try {
      const response = await fetch("/api/card", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error(
          "CARD_LOAD_ERROR:",
          await response.text()
        );
        return;
      }

      const data = await response.json();

      if (!data.card) {
        return;
      }

      const loadedCard: AzaCard = {
        id: data.card.id,
        cardNumber: data.card.cardNumber,
        expiryMonth: Number(data.card.expiryMonth),
        expiryYear: Number(data.card.expiryYear),
        cvv: data.card.cvv,
        cardholderName: data.card.cardholderName,
        type: data.card.type,
        status: data.card.status,
        spendingLimit: Number(data.card.spendingLimit),
      };

      setAzaCard(loadedCard);
      setCardFrozen(data.card.status === "FROZEN");
      setCardSpendingLimit(Number(data.card.spendingLimit));
    } catch (error) {
      console.error("CARD_LOAD_ERROR:", error);
    }
  }

  loadCard();
}, []);

useEffect(() => {
  async function loadRainyDaySavings() {
    try {
      const response = await fetch("/api/savings", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error(
          "RAINY_DAY_SAVINGS_LOAD_ERROR:",
          await response.text()
        );
        return;
      }

      const data = await response.json();

      if (!Array.isArray(data.savings)) {
        setRainyDaySavings([]);
        return;
      }

      const loadedRainyDaySavings = data.savings.map(
        (saving: {
          id: string;
          amount: string;
          status: string;
          reference: string;
          createdAt: string;
        }) => ({
          id: saving.id,
          amount: Number(saving.amount),
          status: saving.status,
          reference: saving.reference,
          createdAt: saving.createdAt,
        })
      );

      setRainyDaySavings(loadedRainyDaySavings);
    } catch (error) {
      console.error(
        "RAINY_DAY_SAVINGS_LOAD_ERROR:",
        error
      );
    }
  }

  loadRainyDaySavings();
}, []);

  const [receiveAmount, setReceiveAmount] = useState<string>("");
  const [receiveTag, setReceiveTag] = useState<string>("@Finovate_pay");
  const [receiveError, setReceiveError] = useState<string>("");
  const [lastReceiveRef, setLastReceiveRef] =useState<string>("");
  const [hideBalance, setHideBalance] = useState(false);
  const [sendAmount, setSendAmount] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [topUpMethod, setTopUpMethod] = useState<"bank" | "card" |null>(null);
  const [topUpPin, setTopUpPin] = useState("");
  const [lastTopUpRef, setLastTopUpRef] = useState("");
  const [topUpError, setTopUpError] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient>({
    name: "Aratumi Eniola",
    tag: "@kishy",
    bank: "Smartcash • 8082482308",
    avatar: "🤠"
  });

const [banks, setBanks] = useState<Bank[]>([]);
const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
const [accountNumber, setAccountNumber] = useState("");
const [beneficiaryName, setBeneficiaryName] = useState("");
const [beneficiaryLoading, setBeneficiaryLoading] = useState(false);
const [beneficiaryError, setBeneficiaryError] = useState("");
const [transferFee] = useState(100);

  const [pin, setPin] = useState("");
const [lastTxRef, setLastTxRef] = useState("");

const [transferAttemptRef, setTransferAttemptRef] = useState("");
const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const [transferStatus, setTransferStatus] = useState<
  "PENDING" | "COMPLETED" | "FAILED" | "REVERSED">("PENDING");

  const [selectedTransaction, setSelectedTransaction] =
     useState<Transaction | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, name: "Aisha Bello", type: "Sent", time: "Today, 9:41 AM", amount: -25000, tag: "@aisha.ng" },
    { id: 2, name: "Tunde Adebayo", type: "Received", time: "Yesterday, 4:18 PM", amount: 80000, tag: "@tunde.pay" },
    { id: 3, name: "Amara Nwosu", type: "Sent", time: "Aug 12, 2:06 PM", amount: -12500, tag: "@amara" }
  ]);

  const recentPeople: Recipient[] = [
    { name: "Kishy", tag: "@kishy.pay", avatar: "👴", bank: "Smartcash • 8082482308" },
    { name: "Joy", tag: "@Joy.ng", avatar: "👧", bank: "OPay • 7012345678" },
    { name: "Victor", tag: "@Victor.pay", avatar: "🤠", bank: "Kuda • 2019876543" },
    { name: "Finovate", tag: "@Finovate.pay", avatar: "👩", bank: "Moniepoint • 5098765432" }
  ];

  const [budgets, setBudgets] = useState<Budget[]>([
    {
      id:1,
      category: "Food & Dining",
      limit: 200000,
      spent: 0,
    },
    {
      id: 2,
      category: "Transportation",
      limit: 100000,
      spent:0,
    },
    {
      id: 3,
      category: "Bills & Utilities",
      limit: 250000,
      spent:0,
    },
    {
      id: 4,
      category: "Shopping",
      limit: 150000,
      spent:0,
    },
    {
      id: 5,
      category: "Entertainment",
      limit: 100000,
      spent: 0,
    },
    {
      id: 6,
      category: "Other",
      limit: 100000,
      spent: 0,
    }
  ]);

  const handleKeyPress = (num: string) => {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      return prev + num;
    });
  };

  useEffect(() => {
    if (flowState === "send_pin" && pin.length === 4) {
      const timer = setTimeout(() => {
        executeSend();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pin, flowState]);

  const handleDeletePin = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const cardRemainingLimit = Math.max(
    cardSpendingLimit - cardSpentThisMonth,
    0
  );

  const totalBudgetLimit = budgets.reduce(
    (total, budget) => total + budget.limit,
    0
  );

  const totalBudgetSpent = budgets.reduce(
    (total, budget) => total + budget.spent,
    0
  );

  const totalBudgetRemaining = Math.max(
    totalBudgetLimit - totalBudgetSpent,
    0
  );


  const totalBudgetPercentage =
    totalBudgetLimit > 0
    ? Math.min(
        (totalBudgetSpent / totalBudgetLimit) * 100,
        100
      )
    : 0;

    const aiCfoInsight = (() => {
  if (accountSecurityStatus === "Review Required") {
    return "I noticed a security issue on your account. Review your security alerts and confirm any transactions you don't recognize.";
  }

  if (totalBudgetPercentage >= 90) {
    return `You're at ${totalBudgetPercentage.toFixed(
      0
    )}% of your total budget. I'm watching your spending closely so you don't overshoot your limits.`;
  }

  if (totalBudgetPercentage >= 75) {
    return `You've used ${totalBudgetPercentage.toFixed(
      0
    )}% of your total budget. You still have room, but I'll keep an eye on your spending.`;
  }

  if (rainyDaySavingsTotal > 0 && savings) {
    return `You're building two savings layers: ₦${rainyDaySavingsTotal.toLocaleString()} in Rainy Day Savings and ₦${savings.amount.toLocaleString()} automatically locked away.`;
  }

  if (rainyDaySavingsTotal > 0) {
    return `Your Rainy Day Savings is now ₦${rainyDaySavingsTotal.toLocaleString()}. Keep building your emergency fund while I monitor your spending.`;
  }

  if (savings) {
    return `You've automatically accumulated ₦${savings.amount.toLocaleString()} in Locked Savings. I'll keep tracking your spending and savings progress.`;
  }

  if (balance <= 0) {
    return "Your available balance is currently low. I'll keep monitoring your account and spending activity.";
  }

  return `Your account is protected. You currently have ₦${balance.toLocaleString()} available, and I'll continue monitoring your spending and savings.`;
})();

const aiCfoActions = (() => {
  const actions: {
    title: string;
    description: string;
    type:
      | "spending"
      | "rainy_day"
      | "locked"
      | "security";
  }[] = [];

  const priority =
    aiCfoAssessment?.priority;

  if (priority === "BALANCE") {
    actions.push({
      title: "Review your balance",
      description:
        "Your available balance needs attention before making additional spending commitments.",
      type: "spending",
    });
  }

  if (priority === "SPENDING") {
    actions.push({
      title: "Review recent spending",
      description:
        `Your recent spending is ₦${aiCfoAssessment?.summary.totalSpending.toLocaleString()}.`,
      type: "spending",
    });
  }

  if (priority === "RAINY_DAY") {
    actions.push({
      title: "Build Rainy Day Savings",
      description:
        "You have Locked Savings but no accessible Rainy Day Savings yet.",
      type: "rainy_day",
    });
  }

  if (accountSecurityStatus === "Review Required") {
    actions.push({
      title: "Review account security",
      description:
        "There is a security item that needs your attention.",
      type: "security",
    });
  }

  if (savings) {
    actions.push({
      title: "Monitor Locked Savings",
      description:
        "Check your automatic savings and its maturity date.",
      type: "locked",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Maintain your current position",
      description:
        "Your CFO doesn't see an immediate priority requiring action.",
      type: "spending",
    });
  }

  return actions.slice(0, 4);
})();

[{
	"resource": "/c:/Users/finovate/Desktop/AZA/app/page.tsx",
	"owner": "typescript",
	"code": "2607",
	"severity": 8,
	"message": "JSX element class does not support attributes because it does not have a 'props' property.",
	"source": "ts",
	"startLineNumber": 7639,
	"startColumn": 21,
	"endLineNumber": 7642,
	"endColumn": 23,
	"modelVersionId": 423,
	"origin": "extHost1"
},{
	"resource": "/c:/Users/finovate/Desktop/AZA/app/page.tsx",
	"owner": "typescript",
	"code": "2786",
	"severity": 8,
	"message": "'Lock' cannot be used as a JSX component.\n  Its type '{ new (): Lock; prototype: Lock; }' is not a valid JSX element type.\n    Type '{ new (): Lock; prototype: Lock; }' is not assignable to type 'new (props: any, context: any) => Component<any, any, any>'.\n      Type 'Lock' is missing the following properties from type 'Component<any, any, any>': context, setState, forceUpdate, render, and 2 more.",
	"source": "ts",
	"startLineNumber": 7639,
	"startColumn": 22,
	"endLineNumber": 7639,
	"endColumn": 26,
	"modelVersionId": 423,
	"origin": "extHost1"
}]

  const getCardPaymentCategory = (merchant: string) => {
  const name = merchant.toLowerCase();

  if (
    name.includes("food") ||
    name.includes("restaurant") ||
    name.includes("uber eats") ||
    name.includes("bolt food") ||
    name.includes("jollof") ||
    name.includes("chicken") ||
    name.includes("pizza") ||
    name.includes("market")
  ) {
    return "Food & Dining";
  }

  if (
    name.includes("uber") ||
    name.includes("bolt") ||
    name.includes("taxi") ||
    name.includes("transport") ||
    name.includes("fuel") ||
    name.includes("petrol")
  ) {
    return "Transportation";
  }

  if (
    name.includes("electric") ||
    name.includes("phcn") ||
    name.includes("water") ||
    name.includes("internet") ||
    name.includes("airtel") ||
    name.includes("mtn") ||
    name.includes("glo") ||
    name.includes("9mobile")
  ) {
    return "Bills & Utilities";
  }

  if (
    name.includes("netflix") ||
    name.includes("spotify") ||
    name.includes("youtube") ||
    name.includes("cinema") ||
    name.includes("movie") ||
    name.includes("game")
  ) {
    return "Entertainment";
  }

  if (
    name.includes("shop") ||
    name.includes("amazon") ||
    name.includes("jumia") ||
    name.includes("konga") ||
    name.includes("store")
  ) {
    return "Shopping";
  }

  return "Other";
};

const toggleCardFreeze = async () => {
  const newStatus = cardFrozen ? "ACTIVE" : "FROZEN";

  try {
    const response = await fetch("/api/card", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        status: newStatus,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "CARD_STATUS_UPDATE_ERROR:",
        data.error || "Unable to update card status."
      );
      return;
    }

    setCardFrozen(data.card.status === "FROZEN");

    setAzaCard((prev) =>
      prev
        ? {
            ...prev,
            status: data.card.status,
          }
        : prev
    );
  } catch (error) {
    console.error("CARD_STATUS_UPDATE_ERROR:", error);
  }
};

const updateCardSpendingLimit = async () => {
  const newLimit = Number(cardLimitInput);

  if (!Number.isFinite(newLimit) || newLimit <= 0) {
    setCardLimitError("Enter a valid spending limit.");
    return;
  }

  try {
    const response = await fetch("/api/card", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        spendingLimit: newLimit,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setCardLimitError(
        data.error || "Unable to update spending limit."
      );
      return;
    }

    const updatedLimit = Number(data.card.spendingLimit);

    setCardSpendingLimit(updatedLimit);

    setAzaCard((prev) =>
      prev
        ? {
            ...prev,
            spendingLimit: updatedLimit,
          }
        : prev
    );

    setCardLimitInput("");
    setCardLimitError("");
    setEditingCardLimit(false);
  } catch (error) {
    console.error("CARD_LIMIT_UPDATE_ERROR:", error);

    setCardLimitError(
      "Something went wrong while updating your spending limit."
    );
  }
};

  const executeCardPayment = async () => {
  const amount = Number(cardPaymentAmount);
  const merchant = cardPaymentMerchant.trim();

  if (cardFrozen) {
    setCardPaymentError(
      "Your card is frozen. Unfreeze it to make a payment."
    );
    return;
  }

  if (!merchant) {
    setCardPaymentError("Enter the merchant name.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setCardPaymentError("Enter a valid payment amount.");
    return;
  }

  if (amount > balance) {
    setCardPaymentError("Insufficient balance.");
    return;
  }

  if (amount > cardRemainingLimit) {
    setCardPaymentError(
      "This payment exceeds your remaining monthly card limit."
    );
    return;
  }

  const PaymentCategory = getCardPaymentCategory(merchant);

  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        amount,
        type: "Card Payment",
        description: `Card payment to ${merchant}`,
        recipient: merchant,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setCardPaymentError(
        data.error || "Card payment failed."
      );
      return;
    }

    const reference = data.transaction.reference;

    setBalance(Number(data.account.balance));

    const rainyDayResponse = await fetch("/api/savings", {
  credentials: "include",
});

if (rainyDayResponse.ok) {
  const rainyDayData = await rainyDayResponse.json();

  if (Array.isArray(rainyDayData.savings)) {
    const refreshedRainyDaySavings = rainyDayData.savings.map(
      (saving: {
        id: string;
        amount: string;
        status: string;
        reference: string;
        createdAt: string;
      }) => ({
        id: saving.id,
        amount: Number(saving.amount),
        status: saving.status,
        reference: saving.reference,
        createdAt: saving.createdAt,
      })
    );

    setRainyDaySavings(refreshedRainyDaySavings);
  }
}
    setCardSpentThisMonth((prev) => prev + amount);

    setBudgets((prev) =>
      prev.map((budget) =>
        budget.category === PaymentCategory
          ? {
              ...budget,
              spent: budget.spent + amount,
            }
          : budget
      )
    );

    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: merchant,
        type: "Card Payment",
        time: "Just now",
        amount: -amount,
        tag: "Card Purchase",
        reference,
        status: "Successful",
        method: "AZA Virtual Card",
        category: PaymentCategory,
      },
      ...prev,
    ]);

    checkTransactionRisk(
      amount,
      "card payment",
      merchant,
      reference
    );

    setCardPaymentError("");
    setCardPaymentAmount("");
    setCardPaymentMerchant("");
    setFlowState("card_payment_success");
  } catch (error) {
    console.error("CARD_PAYMENT_ERROR:", error);

    setCardPaymentError(
      "Something went wrong while processing the card payment."
    );
  }
};

  const createBill = () => {
  const amount = Number(billAmount);

  if (!billProvider.trim()) {
    setBillCreateError("Enter the bill provider.");
    return;
  }

  if (!billCategory) {
    setBillCreateError("Select a bill category.");
    return;
  }

  if (!billAccountNumber.trim()) {
    setBillCreateError("Enter the account number.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setBillCreateError("Enter a valid bill amount.");
    return;
  }

  if (!billDueDate) {
    setBillCreateError("Select a due date.");
    return;
  }

  const newBill: Bill = {
    id: `${Date.now()}-${Math.random()}`,
    category: billCategory,
    provider: billProvider.trim(),
    accountNumber: billAccountNumber.trim(),
    amount,
    dueDate: new Date(
      `${billDueDate}T00:00:00`
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: "Pending",
  };

  setBills((prevBills) => [
    newBill,
    ...prevBills,
  ]);

  setBillCreateError("");
  setFlowState("bills");
};


  const executeBillPayment = async (enteredPin?: string) => {
  if (!selectedBill) return;

  const amount = Number(billPaymentAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setBillPaymentError("Enter a valid payment amount.");
    return;
  }

  if (amount > balance) {
    setBillPaymentError("Insufficient funds in your account.");
    return;
  }

  if (amount > selectedBill.amount) {
    setBillPaymentError("Payment cannot exceed the bill amount.");
    return;
  }

  const pinToUse = enteredPin ?? billPaymentPin;

  if (pinToUse.length !== 4) {
    setBillPaymentError("Enter your 4-digit PIN.");
    return;
  }

  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        amount,
        type: "Bill Payment",
        description: `Bill payment to ${selectedBill.provider}`,
        recipient: selectedBill.provider,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setBillPaymentError(data.error || "Bill payment failed.");
      return;
    }

    const reference = data.transaction.reference;

    setBalance(Number(data.account.balance));

    setBills((prevBills) =>
      prevBills.map((bill) =>
        bill.id === selectedBill.id
          ? {
              ...bill,
              status: "Paid",
            }
          : bill
      )
    );

    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: selectedBill.provider,
        tag: "Bill Payment",
        amount: -amount,
        type: "Bill Payment",
        time: "Just now",
        reference,
        status: "Successful",
        method: "AZA Bills",
        category: selectedBill.category,
      },
      ...prev,
    ]);

    checkTransactionRisk(
      amount,
      "bill payment",
      selectedBill.provider,
      reference
    );

    setLastBillPaymentRef(reference);
    setBillPaymentPin("");
    setBillPaymentError("");
    setFlowState("bill_success");
  } catch (error) {
    console.error("BILL_PAYMENT_ERROR:", error);
    setBillPaymentError(
      "Something went wrong while processing the bill payment."
    );
  }
};
  
  const executeSubscriptionPayment = async (enteredPin?: string) => {
  if (!selectedSubscription) return;
  const amount = Number(subscriptionPaymentAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    setSubscriptionPaymentError("Enter a valid payment amount.");
    return;
  }
  if (amount > balance) {
    setSubscriptionPaymentError("Insufficient funds in your account.");
    return;
  }
  const pinToUse = enteredPin ?? subscriptionPaymentPin;
  if (pinToUse.length !== 4) {
    setSubscriptionPaymentError("Enter your 4-digit PIN.");
    return;
  }
  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        type: "Subscription Payment",
        description: `Subscription payment to ${selectedSubscription.provider}`,
        recipient: selectedSubscription.provider,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setSubscriptionPaymentError(
        data.error || "Subscription payment failed."
      );
      return;
    }
    const reference = data.transaction.reference;
    setBalance(data.account.balance);
    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: selectedSubscription.provider,
        tag: "Subscription Payment",
        amount: -amount,
        type: "Subscription Payment",
        time: "Just now",
        reference,
        status: "Successful",
        method: "AZA Subscriptions",
        category: selectedSubscription.category,
      },
      ...prev,
    ]);
    checkTransactionRisk(
      amount,
      "subscription payment",
      selectedSubscription.provider,
      reference
    );
    setLastSubscriptionPaymentRef(reference);
    setSubscriptionPaymentPin("");
    setSubscriptionPaymentError("");
    setFlowState("subscription_payment_success");
  } catch (error) {
    console.error("Subscription payment error:", error);
    setSubscriptionPaymentError(
      "Unable to process subscription payment. Please try again."
    );
  }
};
    
  const executeSend = async () => {
  const numericAmount = Number(sendAmount);

  if (!selectedRecipient) {
    return;
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return;
  }

  if (numericAmount > balance) {
    return;
  }

  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        amount: numericAmount,
        type: "Sent",
        description: `Transfer to ${selectedRecipient.name}`,
        recipient: selectedRecipient.tag,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TRANSACTION_ERROR:", data);
      return;
    }

    const newReference = data.transaction.reference;

    setLastTxRef(newReference);

    setBalance(Number(data.account.balance));

    if (data.savings) {
  setSavings((prev) => ({
    id: data.savings.id,
    name: "AZA Locked Savings",
    amount: Number(data.savings.amount),
    targetAmount: Number(data.savings.targetAmount),
    interestRate: Number(data.savings.interestRate),
    lockPeriodDays: data.savings.lockPeriodDays,
    startDate: new Date(
      data.savings.startDate
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    maturityDate: new Date(
      data.savings.maturityDate
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: "Active",
  }));
}

    if (sendCategory) {
      setBudgets((prev) =>
        prev.map((budget) =>
          budget.category === sendCategory
            ? {
                ...budget,
                spent: budget.spent + numericAmount,
              }
            : budget
        )
      );
    }

    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: selectedRecipient.name,
        type: "Sent",
        time: "Just now",
        amount: -numericAmount,
        tag: selectedRecipient.tag,
        reference: newReference,
        status: "Successful",
        method: "AZA Transfer",
      },
      ...prev,
    ]);

    checkTransactionRisk(
      numericAmount,
      "send",
      selectedRecipient.name,
      newReference
    );

    setSendAmount("");
    setFlowState("send_success");
  } catch (error) {
    console.error("SEND_TRANSACTION_ERROR:", error);
  }
};


const SAVINGS_INTEREST_RATE = 5;
const SAVINGS_LOCK_PERIOD_DAYS = 300;

const savingsInterest =
  savings
    ? savings.amount * (savings.interestRate / 100)
    : 0;

const savingsMaturityValue =
  savings
    ? savings.amount + savingsInterest
    : 0;


const savingsProgress =
  savings
    ? Math.min(
        (savings.amount / savings.targetAmount) * 100,
        100
      )
    : 0;
const savingsDaysRemaining =
  savings
    ? Math.max(
        Math.ceil(
          (new Date(savings.maturityDate).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        ),
        0
      )
    : 0;
const savingsIsMatured =
  savings
    ? new Date().getTime() >=
      new Date(savings.maturityDate).getTime()
    : false;

const createSavings = async () => {
  const amount = Number(savingsAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setSavingsError("Enter a valid Rainy Day Savings amount.");
    return;
  }

  if (amount > balance) {
    setSavingsError(
      "Insufficient balance for this Rainy Day Savings deposit."
    );
    return;
  }

  try {
    const response = await fetch("/api/savings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setSavingsError(
        data.error || "Unable to create Rainy Day Savings deposit."
      );
      return;
    }

    setBalance(Number(data.account.balance));

    /*
     * Refresh Rainy Day Savings from the database
     * so the UI immediately reflects the latest total.
     */
    const rainyDayResponse = await fetch("/api/savings", {
      credentials: "include",
    });

    if (rainyDayResponse.ok) {
      const rainyDayData = await rainyDayResponse.json();

      if (Array.isArray(rainyDayData.savings)) {
        const refreshedRainyDaySavings = rainyDayData.savings.map(
          (saving: {
            id: string;
            amount: string;
            status: string;
            reference: string;
            createdAt: string;
          }) => ({
            id: saving.id,
            amount: Number(saving.amount),
            status: saving.status,
            reference: saving.reference,
            createdAt: saving.createdAt,
          })
        );

        setRainyDaySavings(refreshedRainyDaySavings);
      }
    }

    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: "AZA Rainy Day Savings",
        tag: "Savings Deposit",
        amount: -amount,
        type: "Rainy Day Savings",
        time: "Just now",
        reference: data.transaction.reference,
        status: "Successful",
        method: "AZA Rainy Day Savings",
        category: "Savings",
      },
      ...prev,
    ]);

    setSavingsAmount("");
    
    setSavingsError("");
    setFlowState("dashboard");
  } catch (error) {
    console.error("RAINY_DAY_SAVINGS_CREATE_ERROR:", error);
    setSavingsError(
      "Something went wrong while creating your Rainy Day Savings deposit."
    );
  }
};

  const checkTransactionRisk = (
    amount: number,
    type: string,
    name: string,
    reference: string
  ) => {
    const riskThreshold = 500000;

    if (amount >= riskThreshold) {
      const newAlert: SecurityAlert = {
        id: `${Date.now()}-${Math.random()}`,
        title: "Large transaction detected",
        description: `A ₦${amount.toLocaleString()} ${type.toLowerCase()} involving ${name} is above your normal transaction threshold.`,
        severity: amount >= 1000000 ? "High" : "Medium",
        time: "Just now",
        status: "Open",
        transactionAmount: amount,
        transactionType: type,
        transactionName: name,
        transactionReference: reference,
      };

      setSecurityAlert((prev) => [
        newAlert,
        ...prev,
      ]);

      setAccountSecurityStatus("Review Required");
    }
  };

  const handleSecurityAction = (
    action: "recognized" | "unrecognized"
  ) => {
    if (!selectedSecurityAlert) return;

    if (action === "recognized") {
      const remainingOpenAlerts = securityAlerts.filter(
        (alert: SecurityAlert) =>
          alert.id !== selectedSecurityAlert.id &&
          alert.status === "Open"
      );

      setSecurityAlert((prev: SecurityAlert[]) =>
        prev.map((alert: SecurityAlert) =>
          alert.id === selectedSecurityAlert.id
            ? {
                ...alert,
                status: "Resolved",
              }
            : alert
        )
      );

      setSelectedSecurityAlert({
        ...selectedSecurityAlert,
        status: "Resolved",
      });

      setSecurityActionMessage(
        "Transaction confirmed. The security alert has been resolved."
      );

      setAccountSecurityStatus(
        remainingOpenAlerts.length === 0
          ? "Protected"
          : "Review Required"
      );

      return;
    }

    if (action === "unrecognized") {
      setSecurityAlert((prev: SecurityAlert[]) =>
        prev.map((alert: SecurityAlert) =>
          alert.id === selectedSecurityAlert.id
            ? {
                ...alert,
                status: "Open",
                severity: "High",
              }
            : alert
        )
      );

      setSelectedSecurityAlert({
        ...selectedSecurityAlert,
        status: "Open",
        severity: "High",
      });

      setAccountSecurityStatus("Review Required");

      if (
        selectedSecurityAlert.transactionType?.toLocaleLowerCase() ===
        "card payment"
      ) {
        setCardFrozen(true);

        setSecurityActionMessage(
          "Transaction reported. Your virtual card has been frozen for protection and the alerthas been escalated for security review."
        );
      } else {
        setSecurityActionMessage(
          "Transaction reported. This alert has been escalated for security review."
        );
      }
    }    
  };
 
  

const executeReceive = async () => {
  const numericAmount = Number(receiveAmount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    alert("Enter a valid amount.");
    return;
  }

  try {
    const response = await fetch("/api/transactions/receive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        amount: numericAmount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("RECEIVE_TRANSACTION_ERROR:", data);
      alert(data.error || "Receive transaction failed.");
      return;
    }

    const newReference = data.transaction.reference;

    setLastReceiveRef(newReference);

    setBalance(Number(data.account.balance));

    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: "Incoming Transfer",
        type: "Received",
        time: "Just now",
        amount: numericAmount,
        tag: "@Finovate_pay",
        reference: newReference,
        status: "Successful",
        method: "Incoming Transfer",
      },
      ...prev,
    ]);

    checkTransactionRisk(
      numericAmount,
      "receive",
      "Incoming Transfer",
      newReference
    );

    setReceiveAmount("");
    setFlowState("receive_success");
  } catch (error) {
    console.error("RECEIVE_TRANSACTION_ERROR:", error);
    alert("Something went wrong while processing the received money.");
  }
};

    const executeTopUp = async () => {
  const numericAmount = Number(topUpAmount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    setTopUpError("Enter a valid amount.");
    setTopUpPin("");
    return;
  }

  if (numericAmount < 100) {
    setTopUpError("Minimum top up amount is 100.");
    setTopUpPin("");
    return;
  }

  if (numericAmount > 1000000) {
    setTopUpError("Maximum top up amount is 1,000,000.");
    setTopUpPin("");
    return;
  }

  if (!topUpMethod) {
    setTopUpError("Select a funding method.");
    setTopUpPin("");
    return;
  }

  try {
    const response = await fetch("/api/transactions/topup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        amount: numericAmount,
        method: topUpMethod,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setTopUpError(data.error || "Top up failed.");
      return;
    }

    const newReference = data.transaction.reference;

    setBalance(Number(data.account.balance));
    setLastTopUpRef(newReference);

    setTransactions((prev) => [
      {
        id: data.transaction.id,
        name: topUpMethod === "bank" ? "Bank Transfer" : "Debit Card",
        type: "Top Up",
        time: "Just now",
        amount: numericAmount,
        tag: topUpMethod === "bank" ? "Bank Funding" : "Card Funding",
        reference: newReference,
        status: "Successful",
        method: topUpMethod === "bank" ? "Bank Transfer" : "Debit Card",
      },
      ...prev,
    ]);

    checkTransactionRisk(
      numericAmount,
      "top up",
      topUpMethod === "bank" ? "Bank Transfer" : "Debit Card",
      newReference
    );

    setTopUpError("");
    setTopUpPin("");
    setFlowState("topup_success");
  } catch (error) {
    console.error("TOP_UP_ERROR:", error);
    setTopUpError("Something went wrong while processing your top up.");
  }
};
    

      
    const handleTopUpKeyPress = (num: string) => {
      setTopUpPin((prev) => {
        if (prev.length >=4) return prev;
        return prev + num;
      });
    };

    useEffect(() => {
  const loadBanks = async () => {
    try {
      const response = await fetch("/api/banks", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("BANKS_ERROR:", data);
        return;
      }

      setBanks(data.banks ?? []);
    } catch (error) {
      console.error("BANKS_LOAD_ERROR:", error);
    }
  };

  loadBanks();
}, []);

    useEffect(() => {
    if (flowState === "topup_pin" || topUpPin.length !==4) {
      return;
    }
    const timer = setTimeout(() => {
      executeTopUp();
    }, 150);

    return () => clearTimeout(timer);
  }, [topUpPin, flowState]);


  useEffect(() => {
  if (flowState !== "send_success" || !lastTxRef) {
    return;
  }

  let cancelled = false;

  const checkTransferStatus = async () => {
    try {
      const response = await fetch("/api/transactions", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || cancelled) {
        return;
      }

      const transaction = data.transactions?.find(
        (item: { reference?: string }) =>
          item.reference === lastTxRef
      );

      if (!transaction) {
        return;
      }

      const status = String(
        transaction.status || ""
      ).toUpperCase();

      if (
        status === "PENDING" ||
        status === "COMPLETED" ||
        status === "FAILED" ||
        status === "REVERSED"
      ) {
        setTransferStatus(status);
      }

      if (
        status === "COMPLETED" ||
        status === "FAILED" ||
        status === "REVERSED"
      ) {
        const accountResponse = await fetch(
          "/api/account",
          {
            credentials: "include",
          }
        );

        const accountData =
          await accountResponse.json();

        if (!cancelled && accountResponse.ok) {
          setBalance(
            Number(accountData.account?.balance ?? balance)
          );
        }

        if (status === "COMPLETED") {
          const savingsResponse = await fetch(
            "/api/locked-savings",
            {
              credentials: "include",
            }
          );

          const savingsData =
            await savingsResponse.json();

          if (
            !cancelled &&
            savingsResponse.ok &&
            savingsData.savings
          ) {
            setSavings({
              id: savingsData.savings.id,
              name: "AZA Locked Savings",
              amount: Number(
                savingsData.savings.amount
              ),
              targetAmount: Number(
                savingsData.savings.targetAmount
              ),
              interestRate: Number(
                savingsData.savings.interestRate
              ),
              lockPeriodDays:
                savingsData.savings.lockPeriodDays,
              startDate: new Date(
                savingsData.savings.startDate
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              maturityDate: new Date(
                savingsData.savings.maturityDate
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              status: "Active",
            });
          }
        }
      }
    } catch (error) {
      console.error(
        "TRANSFER_RECONCILIATION_ERROR:",
        error
      );
    }
  };

  checkTransferStatus();

  const interval = window.setInterval(
    checkTransferStatus,
    3000
  );

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}, [flowState, lastTxRef]);

  const handleDeleteTopUpPin = () => {
    setTopUpPin((prev) => prev.slice(0, -1));
  };

  const handleDeleteSendPin = () => {
    setPin((prev) => prev.slice(0, -1));
  };


const handleConfirmSendTransfer = async () => {
  const numericAmount = Number(sendAmount);

  if (isSubmittingTransfer) return;

  if (pin.length !== 4) {
    alert("Enter your 4-digit PIN.");
    return;
  }

  if (!selectedBank) {
    alert("Please select a bank.");
    return;
  }

  if (accountNumber.length !== 10) {
    alert("Invalid account number.");
    return;
  }

  if (!beneficiaryName) {
    alert("Please verify the beneficiary first.");
    return;
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    alert("Enter a valid transfer amount.");
    return;
  }

  if (numericAmount > 1000000) {
    alert("The maximum transfer amount is ₦1,000,000.");
    return;
  }

  if (numericAmount + transferFee > balance) {
    alert("Insufficient funds to cover the transfer and fee.");
    return;
  }

  setIsSubmittingTransfer(true);

  // Reuse the same reference if this attempt is retried.
  const reference =
    transferAttemptRef || `aza-${crypto.randomUUID()}`;

  if (!transferAttemptRef) {
    setTransferAttemptRef(reference);
  }

  try {
    // STEP 1: Create or retrieve the Paystack recipient.
    const recipientResponse = await fetch(
      "/api/transfers/recipient",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: beneficiaryName,
          accountNumber,
          bankCode: selectedBank.code,
          currency: "NGN",
        }),
      }
    );

    const recipientData = await recipientResponse.json();

    if (!recipientResponse.ok || !recipientData.recipientCode) {
      alert(
        recipientData.error ||
          "Unable to create the transfer recipient."
      );
      return;
    }

    const recipientCode = recipientData.recipientCode;

    setSelectedRecipient((prev) => ({
      ...prev,
      name: beneficiaryName,
      accountNumber,
      bankCode: selectedBank.code,
      bankName: selectedBank.name,
      recipientCode,
      bank: `${selectedBank.name} • ${accountNumber}`,
    }));

    const transferPayload = {
      recipientCode,
      amount: numericAmount,
      recipientName: beneficiaryName,
      reference,
    };

    // STEP 2: Create or retrieve the pending AZA transaction.
    const reservationResponse = await fetch("/api/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(transferPayload),
    });

    const reservationData = await reservationResponse.json();

    if (!reservationResponse.ok) {
      if (reservationData.requiresReconciliation) {
        setLastTxRef(reference);
      }

      alert(
        reservationData.error ||
          "Unable to prepare this transfer."
      );
      return;
    }

    const confirmedReference =
      reservationData.transaction?.reference ||
      reservationData.reference ||
      reference;

    setLastTxRef(confirmedReference);

    // A security review means the transfer has NOT been submitted.
    if (reservationData.requiresReview) {
      alert(
        reservationData.message ||
          "This transfer requires additional security review."
      );
      return;
    }

    // STEP 3: Verify the PIN against this exact transaction.
    if (reservationData.requiresPin) {
      const pinResponse = await fetch(
        "/api/security/transaction-pin/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            reference: confirmedReference,
            pin,
          }),
        }
      );

      const pinData = await pinResponse.json();

      if (!pinResponse.ok || !pinData.success) {
        alert(
          pinData.error ||
            "PIN verification failed. Please try again."
        );
        return;
      }
    }

    // STEP 4: Submit the SAME transaction reference to Paystack.
    const submissionResponse = await fetch("/api/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        ...transferPayload,
        reference: confirmedReference,
      }),
    });

    const submissionData = await submissionResponse.json();

    if (!submissionResponse.ok) {
      if (submissionData.requiresReconciliation) {
        setLastTxRef(confirmedReference);

        alert(
          "Your transfer may already have reached processing. Do not create another transfer. Its status must be reconciled."
        );
        return;
      }

      alert(
        submissionData.error ||
          "The transfer could not be submitted."
      );
      return;
    }

    if (submissionData.requiresReview) {
      alert(
        submissionData.message ||
          "This transfer requires additional security review."
      );
      return;
    }

    const finalReference =
      submissionData.transaction?.reference ||
      submissionData.reference ||
      confirmedReference;

    setLastTxRef(finalReference);
    setTransferStatus("PENDING");
    setPin("");
    setFlowState("send_success");

    // Keep the reference until this attempt is finished.
  } catch (error) {
    console.error("SEND_TRANSFER_ERROR:", error);

    setLastTxRef(reference);

    alert(
      "We could not confirm the transfer response. Do not start another transfer. Keep this reference for reconciliation: " +
        reference
    );
  } finally {
    setIsSubmittingTransfer(false);
  }
};


  return (
    <main className="min-h-screen bg-[#111111] text-zinc-900 flex justify-center items-center p-0 md:p-4 font-sans">
      <div className="w-full max-w-md h-[100vh] bg-gradient-to-b from-[#F3EEEA] via-[#EBE5DF] to-[#E3DCD5] md:rounded-[48px] shadow-2xl flex flex-col justify-between overflow-hidden relative border-4 border-zinc-800">
        
        {/* Header Bar */}
        <div className="pt-3 px-7 flex justify-between items-center text-xs font-semibold text-zinc-800 select-none z-10">
          <span>12:08</span>
          <div className="w-24 h-5 bg-black rounded-full flex justify-center items-center">
            <div className="w-3 h-3 bg-zinc-900 rounded-full"></div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 bg-zinc-800 rounded-sm"></div>
          </div>
        </div>

        {/* Dynamic Screen Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 pb-28 space-y-5">

          {/* TOP UP METHOD */}
            
          {flowState === "topup_method" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("dashboard")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Add Money
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Choose how you want to fund your AZA wallet
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50">
                <p className="text-xs font-bold text-zinc-800 mb-4">
                  Funding Method
                </p>

                <div className="space-y-3">

                  <button
                    onClick={() => {
                      setTopUpMethod("bank");
                      setTopUpError("");
                      setFlowState("topup_input");
                    }}
                    className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-4 text-left hover:bg-orange-50 transition"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
                      🏦
                    </div>

                    <div className="flex-1">
                      <p className="font-bold text-sm text-zinc-900">
                        Bank Transfer
                      </p>

                      <p className="text-xs text-zinc-500 mt-1">
                        Add money from your bank account
                      </p>
                    </div>

                    <span className="text-zinc-400">›</span>
                  </button>

                  <button
                    onClick={() => {
                      setTopUpMethod("card");
                      setTopUpError("");
                      setFlowState("topup_input");
                    }}
                    className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-4 text-left hover:bg-orange-50 transition"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
                      💳
                    </div>

                    <div className="flex-1">
                      <p className="font-bold text-sm text-zinc-900">
                        Debit Card
                      </p>

                      <p className="text-xs text-zinc-500 mt-1">
                        Fund your wallet with a debit card
                      </p>
                    </div>

                    <span className="text-zinc-400">›</span>
                  </button>

                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-xs text-orange-800 leading-relaxed">
                  AZA keeps your funding experience simple and transparent.
                  You will review the amount before confirming.
                </p>
              </div>
            </div>
          )}

          {/*TOP UP AMOUNT */}
          {flowState === "topup_input" && (
            <div className="space-y-5">

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("topup_method")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Add Money
                  </h2>

                  <p className="text-xs text-zinc-500">
                    {topUpMethod === "bank"
                      ? "Bank Transfer"
                      : "Debit Card"}
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 text-center shadow-sm border border-white/60">

                <p className="text-xs text-zinc-500">
                  Amount to add
                </p>

                <div className="text-3xl font-extrabold text-zinc-900 flex items-center justify-center gap-1 mt-3">
                  <span>₦</span>

                  <input
                    type="number"
                    inputMode="numeric"
                    min="100"
                    max="1000000"
                    value={topUpAmount}
                    onChange={(e) => {
                      setTopUpAmount(e.target.value);
                      setTopUpError("");
                    }}
                    placeholder="0"
                    className="w-56 bg-transparent text-center outline-none font-bold text-3xl"
                  />
                </div>

                <p className="text-xs text-zinc-500 mt-3">
                  Current balance:{" "}
                  <span className="font-semibold">
                    ₦{balance.toLocaleString()}
                  </span>
                </p>

                <div className="flex justify-center flex-wrap gap-2 mt-5">
                  {["5000", "25000", "100000", "250000"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setTopUpAmount(preset);
                        setTopUpError("");
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                        topUpAmount === preset
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      ₦{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {topUpError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-red-600">
                    {topUpError}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  const numericAmount = Number(topUpAmount);

                  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                    setTopUpError("Enter a valid amount.");
                    return;
                  }

                  if (numericAmount < 100) {
                    setTopUpError("Minimum top up amount is ₦100.");
                    return;
                  }

                  if (numericAmount > 1000000) {
                    setTopUpError("Maximum top up amount is ₦1,000,000.");
                    return;
                  }

                  setTopUpError("");
                  setTopUpPin("");
                  setFlowState("topup_pin");
                }}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Review Top Up
              </button>

            </div>
          )}

          {/* TOP UP PIN */}
          {flowState === "topup_pin" && (
            <div className="space-y-5">

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("topup_input")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Confirm Top Up
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Enter your 4-digit wallet PIN
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 text-center">

                <div className="w-14 h-14 rounded-full bg-orange-100 text-2xl flex items-center justify-center mx-auto mb-3">
                  {topUpMethod === "bank" ? "🏦" : "💳"}
                </div>

                <p className="text-xs text-zinc-500">
                  You are adding
                </p>

                <h3 className="text-3xl font-extrabold text-zinc-900 mt-1">
                  ₦{Number(topUpAmount).toLocaleString()}
                </h3>

                <p className="text-xs text-zinc-500 mt-1">
                  via{" "}
                  <span className="font-semibold text-zinc-800">
                    {topUpMethod === "bank"
                      ? "Bank Transfer"
                      : "Debit Card"}
                  </span>
                </p>

              </div>

              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-12 h-3 rounded-full transition-all duration-200 ${
                      topUpPin.length > idx
                        ? "bg-zinc-950 scale-105"
                        : "bg-white/60 border border-zinc-300"
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 px-4 pt-2">

                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                  (num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleTopUpKeyPress(num)}
                      className="h-14 rounded-full bg-white/80 shadow-sm text-xl font-bold text-zinc-800 active:bg-zinc-200 flex items-center justify-center"
                    >
                     {num}
                    </button>
                  ))}
                

                <div></div>

                <button
                  type="button"
                  onClick={() => handleTopUpKeyPress("0")}
                  className="h-14 rounded-full bg-white/80 shadow-sm text-xl font-bold text-zinc-800 active:bg-zinc-200 flex items-center justify-center"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleDeleteTopUpPin}
                  className="h-14 rounded-full bg-white/80 shadow-sm text-zinc-800 active:bg-zinc-200 flex items-center justify-center"
                >
                  <Delete size={20} />
                </button>

              </div>

            </div>
          )}

          {/* TOP UP SUCCESS */}
          {flowState === "topup_success" && (
            <div className="space-y-5">

              <div className="flex items-center justify-between">

                <button
                  onClick={() => {
                    setFlowState("dashboard");
                    setActiveTab("home");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Top Up Complete
                  </h2>
                </div>

                <div className="w-9"></div>

              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 text-center space-y-4">

                <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30">
                  <Check size={32} strokeWidth={3} />
                </div>

                <div>

                  <p className="text-xs text-zinc-400">
                    Money added successfully
                  </p>

                  <h3 className="text-3xl font-extrabold text-zinc-900 mt-1">
                    ₦{Number(topUpAmount).toLocaleString()}
                  </h3>

                  <p className="text-xs text-zinc-500 mt-2">
                    New balance
                  </p>

                  <p className="font-bold text-zinc-900">
                    ₦{balance.toLocaleString()}
                  </p>

                  <p className="text-[10px] text-zinc-400 mt-2">
                    Refrence: {lastTopUpRef}
                  </p>

                </div>

                <button
                  onClick={() => {
                    setFlowState("dashboard");
                    setActiveTab("home");
                    setTopUpAmount("");
                    setTopUpMethod(null);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-md shadow-orange-500/20 mt-2"
                >
                  Done
                </button>

              </div>

            </div>
          )}

          {/* SEND INPUT */}
          {flowState === "send_input" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setFlowState("dashboard")} className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700">
                  <ArrowLeft size={18} />
                </button>
                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">Send Money</h2>
                  <p className="text-xs text-zinc-500">Pay with tag or account number</p>
                </div>
                <div className="w-9"></div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 text-center shadow-sm border border-white/50">
                <div className="text-3xl font-extrabold text-zinc-900 flex items-center justify-center gap-1">
                  <span>₦</span>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-48 bg-transparent text-center outline-none font-bold text-3xl"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Balance: <span className="font-semibold">₦{balance.toLocaleString()}</span>
                </p>

                <div className="flex justify-center gap-2 mt-4">
                  {["5000", "25000", "100000"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSendAmount(preset)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                        sendAmount === preset ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      ₦{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50">
                <p className="text-xs font-bold text-zinc-800 mb-3">Recent People</p>
                <div className="flex justify-between gap-2 overflow-x-auto pb-1">
                  {recentPeople.map((person) => (
                    <button
                      key={person.tag}
                      onClick={() => setSelectedRecipient(person)}
                      className={`flex flex-col items-center p-2 rounded-2xl min-w-[72px] transition ${
                        selectedRecipient.tag === person.tag ? "border-2 border-orange-500 bg-orange-50/50" : ""
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-xl shadow-inner">
                        {person.avatar}
                      </div>
                      <span className="text-xs font-semibold text-zinc-800 mt-1">{person.name}</span>
                      <span className="text-[10px] text-zinc-400">{person.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-sm space-y-3 border border-white/50">

              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Select Bank
                </label>

                <select
                  value={selectedBank?.code ?? ""}
                  onChange={(e) => {
                    const bank = banks.find(
                      (item) => item.code === e.target.value
                    );

                    setSelectedBank(bank ?? null);
                    setBeneficiaryName("");
                    setBeneficiaryError("");
                  }}
                  className="w-full bg-transparent text-sm font-bold text-zinc-800 outline-none"
                >
                  <option value="">Choose a bank</option>

                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Account Number
                </label>

                <div className="flex items-center gap-2">
                  <User className="text-zinc-400" size={16} />

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit account number"
                    value={accountNumber}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);

                      setAccountNumber(value);
                      setBeneficiaryName("");
                      setBeneficiaryError("");
                    }}
                    className="w-full bg-transparent text-sm font-bold text-zinc-800 outline-none"
                  />
                </div>
              </div>

              {beneficiaryName && (
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200">
                  <p className="text-[10px] text-orange-600 font-semibold">
                    Beneficiary
                  </p>

                  <p className="text-sm font-bold text-zinc-900 mt-1">
                    {beneficiaryName}
                  </p>
                </div>
              )}

              {beneficiaryError && (
                <p className="text-xs text-red-500 font-semibold px-1">
                  {beneficiaryError}
                </p>
              )}

              <button
                type="button"
                disabled={
                  beneficiaryLoading ||
                  !selectedBank ||
                  accountNumber.length !== 10
                }
                onClick={async () => {
                  if (!selectedBank) {
                    setBeneficiaryError("Please select a bank.");
                    return;
                  }

                  if (accountNumber.length !== 10) {
                    setBeneficiaryError(
                      "Enter a valid 10-digit account number."
                    );
                    return;
                  }

                  setBeneficiaryLoading(true);
                  setBeneficiaryError("");
                  setBeneficiaryName("");

                  try {
                    const response = await fetch(
                      "/api/beneficiaries/resolve",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({
                          accountNumber,
                          bankCode: selectedBank.code,
                        }),
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      setBeneficiaryError(
                        data.error ||
                          "We couldn't verify this account."
                      );
                      return;
                    }

                    setBeneficiaryName(data.beneficiary.accountName);

                    setSelectedRecipient((prev) => ({
                      ...prev,
                      name: data.beneficiary.accountName,
                      accountNumber: data.beneficiary.accountNumber,
                      bankCode: data.beneficiary.bankCode,
                      bankName: selectedBank.name,
                      bank: `${selectedBank.name} • ${data.beneficiary.accountNumber}`,
                    }));
                  } catch (error) {
                    console.error(
                      "BENEFICIARY_RESOLVE_ERROR:",
                      error
                    );

                    setBeneficiaryError(
                      "Unable to verify the account right now."
                    );
                  } finally {
                    setBeneficiaryLoading(false);
                  }
                }}
                className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-xs font-bold disabled:opacity-40"
              >
                {beneficiaryLoading
                  ? "Verifying account..."
                  : "Verify Account"}
              </button>

            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
              <label className="block text-[11px] text-zinc-400 mb-1">
                Budget Category
              </label>

              <select
                value={sendCategory}
                onChange={(e) => setSendCategory(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-zinc-800 outline-none"
              >
                <option value="">No category</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.category}>
                    {budget.category}
                  </option>
                ))}
              </select>
            </div>
              <button
              onClick={() => {
                const numericAmount = Number(sendAmount);

                if (!selectedBank) {
                  alert("Please select a bank.");
                  return;
                }

                if (accountNumber.length !== 10) {
                  alert("Enter a valid 10-digit account number.");
                  return;
                }

                if (!beneficiaryName) {
                  alert("Please verify the beneficiary account first.");
                  return;
                }

                if (
                  !selectedRecipient.accountNumber ||
                  !selectedRecipient.bankcode
                ) {
                  alert("Please verify the beneficiary account first.");
                  return;
                }

                if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                  alert("Enter a valid amount.");
                  return;
                }

                if (numericAmount + transferFee > balance) {
                  alert("Insufficient funds to cover the transfer and fee.");
                  return;
                }

                if (numericAmount > 1000000) {
                  alert("The maximum transfer amount is ₦1,000,000.");
                  return;
                }

                setPin("");
                setFlowState("send_pin");
              }}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                <Check size={18} /> Review Transfer
              </button>
            </div>
          )}

          {/* CONFIRM PIN */}
          {flowState === "send_pin" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button 
                   onClick={() => {
                     setPin("");
                     setFlowState("send_input");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                  >
                  <ArrowLeft size={18} />
                </button>
                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">Confirm PIN</h2>
                  <p className="text-xs text-zinc-500">Enter your 4-digit wallet PIN</p>
                </div>
                <div className="w-9"></div>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-orange-100 text-2xl flex items-center justify-center mx-auto mb-2">
                    {selectedRecipient.avatar || "👤"}
                  </div>

                  <h3 className="text-xl font-extrabold text-zinc-900">
                    Confirm Transfer
                  </h3>

                  <p className="text-xs text-zinc-500 mt-1">
                    Review the details before entering your PIN
                  </p>
                </div>

                <div className="mt-5 space-y-3">

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Beneficiary
                    </span>

                    <span className="text-sm font-bold text-zinc-900 text-right">
                      {beneficiaryName || selectedRecipient.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Bank
                    </span>

                    <span className="text-sm font-semibold text-zinc-800 text-right">
                      {selectedRecipient.bankName ||
                        selectedBank?.name ||
                        "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Account Number
                    </span>

                    <span className="text-sm font-semibold text-zinc-800">
                      {selectedRecipient.accountNumber ||
                        accountNumber ||
                        "—"}
                    </span>
                  </div>

                  <div className="border-t border-zinc-200 pt-3 space-y-2">

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Transfer amount
                      </span>

                      <span className="text-sm font-semibold text-zinc-900">
                        ₦{Number(sendAmount).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        AZA transfer fee
                      </span>

                      <span className="text-sm font-semibold text-zinc-900">
                        ₦{transferFee.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold text-zinc-900">
                        Total
                      </span>

                      <span className="text-lg font-extrabold text-zinc-900">
                        ₦{(
                          Number(sendAmount) + transferFee
                        ).toLocaleString()}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-12 h-3 rounded-full transition-all duration-200 ${
                      pin.length > idx ? "bg-zinc-950 scale-105" : "bg-white/60 border border-zinc-300"
                    }`}
                  ></div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 px-4 pt-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num)}
                    className="h-14 rounded-full bg-white/80 shadow-sm text-xl font-bold text-zinc-800 active:bg-zinc-200 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <div></div>
                <button
                  onClick={() => handleKeyPress("0")}
                  className="h-14 rounded-full bg-white/80 shadow-sm text-xl font-bold text-zinc-800 active:bg-zinc-200 flex items-center justify-center"
                >
                  0
                </button>
                <button
                  onClick={handleDeleteSendPin}
                  className="h-14 rounded-full bg-sssswhite/80 shadow-sm text-zinc-800 active:bg-zinc-200 flex items-center justify-center"
                >
                  <Delete size={20} />
                </button>
              <button
                type="button"
                disabled={pin.length !== 4 || isSubmittingTransfer}
                onClick={handleConfirmSendTransfer}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30 disabled:opacity-40"
              >
                {isSubmittingTransfer ? "Processing..." : "Confirm Transfer"}
              </button>
              </div>
            </div>
          )}

          {/* TRANSFER PENDING */}
          {flowState === "send_success" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSendAmount("");
                    setPin("");
                    setFlowState("dashboard");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                <h2 className="font-bold text-lg text-zinc-900">
                  {transferStatus === "COMPLETED"
                    ? "Transfer Successful"
                    : transferStatus === "FAILED"
                    ? "Transfer Failed"
                    : transferStatus === "REVERSED"
                    ? "Transfer Reversed"
                    : "Transfer Pending"}
                </h2>

                <p className="text-xs text-zinc-500">
                  {transferStatus === "COMPLETED"
                    ? "Your transfer has been completed successfully"
                    : transferStatus === "FAILED"
                    ? "The transfer could not be completed"
                    : transferStatus === "REVERSED"
                    ? "The transfer was reversed"
                    : "We're waiting for confirmation"}
                </p>
                </div>

                <div className="w-9"></div>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 text-center space-y-5">

                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    transferStatus === "COMPLETED"
                      ? "bg-green-100 text-green-600"
                      : transferStatus === "FAILED"
                      ? "bg-red-100 text-red-600"
                      : transferStatus === "REVERSED"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {transferStatus === "PENDING" ? (
                    <div className="w-7 h-7 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
                  ) : (
                    <span className="text-2xl font-black">
                      {transferStatus === "COMPLETED"
                        ? "✓"
                        : transferStatus === "FAILED"
                        ? "!"
                        : "↻"}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-zinc-900">
                    ₦{Number(sendAmount).toLocaleString()}
                  </h3>

                  <p className="text-sm text-zinc-700 mt-1">
                    Transfer to{" "}
                    <span className="font-bold">
                      {beneficiaryName || selectedRecipient.name}
                    </span>
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {selectedBank?.name || selectedRecipient.bankName || "Bank transfer"}
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-4 text-left space-y-3">

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-zinc-500">
                      Account number
                    </span>

                    <span className="text-xs font-bold text-zinc-800">
                      {selectedRecipient.accountNumber || accountNumber}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-zinc-500">
                      Transfer fee
                    </span>

                    <span className="text-xs font-bold text-zinc-800">
                      ₦{transferFee.toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t border-zinc-200 pt-3 flex justify-between gap-4">
                    <span className="text-sm font-bold text-zinc-900">
                      Total
                    </span>

                    <span className="text-sm font-extrabold text-zinc-900">
                      ₦{(
                        Number(sendAmount) + transferFee
                      ).toLocaleString()}
                    </span>
                  </div>

                </div>

                <div
                  className={`rounded-2xl p-4 text-left ${
                    transferStatus === "COMPLETED"
                      ? "bg-green-50 border border-green-100"
                      : transferStatus === "FAILED"
                      ? "bg-red-50 border border-red-100"
                      : transferStatus === "REVERSED"
                      ? "bg-yellow-50 border border-yellow-100"
                      : "bg-orange-50 border border-orange-100"
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      transferStatus === "COMPLETED"
                        ? "text-green-700"
                        : transferStatus === "FAILED"
                        ? "text-red-700"
                        : transferStatus === "REVERSED"
                        ? "text-yellow-700"
                        : "text-orange-700"
                    }`}
                  >
                    {transferStatus === "COMPLETED"
                      ? "Transfer completed"
                      : transferStatus === "FAILED"
                      ? "Transfer failed"
                      : transferStatus === "REVERSED"
                      ? "Transfer reversed"
                      : "Transfer is being processed"}
                  </p>

                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    {transferStatus === "COMPLETED"
                      ? "The bank has confirmed your transfer."
                      : transferStatus === "FAILED"
                      ? "The transfer was not completed. Your AZA balance was not deducted for the failed transfer."
                      : transferStatus === "REVERSED"
                      ? "The transfer was reversed and AZA has reconciled the transaction."
                      : "Your transfer has been submitted. AZA will update this transaction when the bank confirms the final status."}
                  </p>
                </div>

                {lastTxRef && (
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                      Reference
                    </p>

                    <p className="text-xs font-semibold text-zinc-700 mt-1 break-all">
                      {lastTxRef}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSendAmount("");
                    setPin("");
                    setFlowState("dashboard");
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-md shadow-orange-500/20"
                >
                  Done
                </button>

              </div>
            </div>
          )}
          {/*RECEIVE MONEY */}
          {flowState === "receive_input" && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("dashboard")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Receive Money
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Receive money into your AZA wallet
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* AZA Identity */}
              <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white rounded-3xl p-6 shadow-xl">

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      Your AZA Tag
                    </p>

                    <p className="text-xl font-extrabold mt-1">
                      @Finovate_pay
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-black text-xs">
                    AZA
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-white/10 border border-white/10">
                  <p className="text-[10px] text-zinc-400">
                    Account Number
                  </p>

                  <p className="text-lg font-bold tracking-wider">
                    8082482308
                  </p>

                  <p className="text-[10px] text-zinc-400 mt-1">
                    AZA Wallet • Finovate Bank
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      "AZA Tag: @Finovate_pay | Account: 8082482308"
                    );
                    alert("AZA payment details copied.");
                  }}
                  className="w-full mt-4 py-3 rounded-2xl bg-white text-zinc-900 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy Payment Details
                </button>

              </div>

              {/* QR Area */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                <p className="text-xs font-bold text-zinc-800">
                  Scan to Pay
                </p>

                <div className="w-40 h-40 mx-auto mt-4 rounded-3xl bg-zinc-950 flex items-center justify-center">

                  <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center">
                    <div className="grid grid-cols-5 gap-1">

                      {Array.from({ length: 25 }).map((_, index) => (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-[2px] ${
                            index % 3 === 0 || index % 5 === 0
                              ? "bg-zinc-900"
                              : "bg-white"
                          }`}
                        />
                      ))}

                    </div>
                  </div>

                </div>

                <p className="text-[10px] text-zinc-400 mt-3">
                  Anyone paying you can use your AZA tag,
                  account number or QR code.
                </p>

              </div>

              {/* Development Receive Simulator */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50">

                <p className="text-xs font-bold text-zinc-800">
                  Receive Amount
                </p>

                <div className="mt-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">

                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Amount
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-zinc-800">
                      ₦
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      className="w-full bg-transparent outline-none text-xl font-bold text-zinc-900"
                    />
                  </div>

                </div>

                <div className="flex gap-2 mt-3">

                  {["5000", "25000", "100000"].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setReceiveAmount(amount)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-bold ${
                        receiveAmount === amount
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      ₦{Number(amount).toLocaleString()}
                    </button>
                  ))}

                </div>

              </div>

              <button
                onClick={executeReceive}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                <ArrowDownLeft size={18} />
                Simulate Incoming Payment
              </button>

              <p className="text-center text-[10px] text-zinc-400 px-6">
                Development mode: this simulates a successful incoming
                payment so we can test AZA's wallet and transaction system.
              </p>

            </div>
          )}

          {/*RECEIVE SUCCESS */}
          {flowState === "receive_success" && (
            <div className="space-y-5">

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("dashboard")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Money Received
                  </h2>
                </div>

                <div className="w-9"></div>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 text-center space-y-4">

                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <Check size={32} strokeWidth={3} />
                </div>

                <div>
                  <p className="text-xs text-zinc-400">
                    Payment received
                  </p>

                  <h3 className="text-3xl font-extrabold text-zinc-900 mt-1">
                    +₦{Number(receiveAmount).toLocaleString()}
                  </h3>

                  <p className="text-xs text-zinc-500 mt-2">
                    Added to your AZA wallet
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-4 text-left">

                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400">
                      From
                    </span>

                    <span className="text-xs font-bold text-zinc-800">
                      Incoming Transfer
                    </span>
                  </div>

                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-zinc-400">
                      Refrence
                    </span>

                    <span className="text-xs font-bold text-zinc-800">
                      {lastReceiveRef}
                    </span>
                  </div>

                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-zinc-400">
                      Status
                    </span>

                    <span className="text-xs font-bold text-emerald-600">
                      Successful
                    </span>
                  </div>

                </div>

                <button
                  onClick={() => setFlowState("dashboard")}
                  className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-md shadow-orange-500/20"
                >
                  Done
                </button>

              </div>

            </div>
          )}

        {/* CARD PAYMENT */}
        {flowState === "card_payment" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCardPaymentError("");
                  setCardPaymentAmount("");
                  setCardPaymentMerchant("");
                  setFlowState("dashboard");
                  setActiveTab("cards");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Make Card Payment
                </h2>
                <p className="text-xs text-zinc-500">
                  Pay securely with your AZA virtual card
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-wider">
                  AZA CARD
                </span>

                <ShieldCheck
                  size={20}
                  className={
                    cardFrozen
                      ? "text-zinc-500"
                      : "text-orange-400"
                  }
                />
              </div>

              <p className="mt-8 text-xs text-zinc-400">
                Available balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                ₦{balance.toLocaleString()}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Card limit remaining
                </span>

                <span className="text-sm font-semibold">
                  ₦{cardRemainingLimit.toLocaleString()}
                </span>
              </div>
            </div>

            {cardFrozen && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-orange-700">
                  Your card is frozen
                </p>

                <p className="mt-1 text-xs leading-5 text-orange-600">
                  Unfreeze your card before making a payment.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Merchant
                </label>

                <input
                  type="text"
                  value={cardPaymentMerchant}
                  onChange={(e) => {
                    setCardPaymentMerchant(e.target.value);
                    setCardPaymentError("");
                  }}
                  placeholder="e.g. Netflix"
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm font-medium outline-none transition focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Payment Amount
                </label>

                <div className="mt-2 flex items-center rounded-2xl border border-zinc-200 bg-white px-4">
                  <span className="text-sm text-zinc-500">
                    ₦
                  </span>

                  <input
                    type="number"
                    value={cardPaymentAmount}
                    onChange={(e) => {
                      setCardPaymentAmount(e.target.value);
                      setCardPaymentError("");
                    }}
                    placeholder="0"
                    className="w-full bg-transparent px-3 py-4 text-lg font-bold outline-none"
                  />
                </div>
              </div>

              {cardPaymentError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                  {cardPaymentError}
                </p>
              )}

              <button
                onClick={executeCardPayment}
                className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Pay with AZA Card
              </button>
            </div>
          </div>
        )}

        {/* CARD PAYMENT SUCCESS */}
        {flowState === "card_payment_success" && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <Check size={38} className="text-green-500" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-zinc-900">
                Payment Successful
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Your AZA Card payment has been completed.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-zinc-200 bg-white p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Merchant
                </span>

                <span className="text-sm font-semibold text-zinc-900">
                  {cardPaymentMerchant}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Amount
                </span>

                <span className="text-lg font-bold text-zinc-900">
                  ₦{Number(cardPaymentAmount).toLocaleString()}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Payment Method
                </span>

                <span className="text-sm font-semibold text-zinc-900">
                  AZA Virtual Card
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setCardPaymentAmount("");
                setCardPaymentMerchant("");
                setCardPaymentError("");
                setFlowState("dashboard");
                setActiveTab("cards");
              }}
              className="w-full rounded-2xl bg-zinc-900 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Done
            </button>
          </div>
        )}
        
          {/* DASHBOARD HOME */}
          {flowState === "dashboard" && activeTab === "home" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-200 border-2 border-white shadow-sm flex items-center justify-center text-xl">
                    🧔🏻‍♂️
                  </div>
                  <div>
                    <h1 className="font-bold text-sm text-zinc-900">{User.name}</h1>
                    <p>{user.tag}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700">
                    <Search size={18} />
                  </button>
                  <button className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700">
                    <Bell size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-xs">
                    AZA
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                    ↗️ +₦248K
                  </span>
                </div>

                <div className="mt-5 text-center">
                  <p className="text-xs text-zinc-400 font-mono tracking-wide">@Finovate_pay</p>
                  <h2 className="text-3xl font-extrabold mt-1 tracking-tight">
                    {hideBalance ? "••••••••" : `₦${balance.toLocaleString()}`}
                  </h2>
                  <button 
                    onClick={() => setHideBalance(!hideBalance)} 
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs text-zinc-300 backdrop-blur-md"
                  >
                    {hideBalance ? <Eye size={12} /> : <EyeOff size={12} />} {hideBalance ? "Show Balance" : "Hide Balance"}
                  </button>
                </div>
              </div>


              {/* AI CFO */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-5 text-white shadow-lg shadow-orange-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-200" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-100">AI CFO Insights</span>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold leading-snug">
                  {aiCfoInsight}
                </p>
              </div>

              {/* RAINY DAY SAVINGS */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <span className="text-lg">🌧️</span>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Rainy Day Savings
                      </p>

                      <h3 className="text-xl font-extrabold text-zinc-900 mt-0.5">
                        {hideBalance
                          ? "••••••"
                          : `₦${rainyDaySavingsTotal.toLocaleString()}`}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSavingsAmount("");
                      
                      setSavingsError("");
                      setFlowState("savings");
                    }}
                    className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold active:scale-95 transition"
                  >
                    + Add Money
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    Money you've intentionally set aside for unexpected expenses.
                  </p>

                  <span className="text-[11px] font-bold text-emerald-600">
                    {rainyDaySavings.length}{" "}
                    {rainyDaySavings.length === 1 ? "deposit" : "deposits"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    setTopUpAmount("");
                    setTopUpMethod(null);
                    setTopUpPin("");
                    setTopUpError("");
                    setFlowState("topup_method");
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50 active:scale-95 transition">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-1">
                      <Plus size={18} />
                    </div>

                    <span className="text-[11px] font-bold text-zinc-800">
                      Top Up
                    </span>
                </button>

                <button onClick={() => {
                  setReceiveAmount("");
                  setReceiveError("");
                  setFlowState("receive_input");
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50 active:scale-95 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                    <ArrowDownLeft size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-800">Receive</span>
                </button>

                <button className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                    <Repeat size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-800">Swap</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFlowState("savings");
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1">
                    <span className="text-sm font-extrabold">%</span>
                  </div>

                  <span className="text-[11px] font-bold text-zinc-800">
                    Savings
                  </span>
                </button>

                <button 
                  onClick={() => {
                    setSendAmount("");
                    setPin("");
                    setFlowState("send_input");
                  }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-1">
                    <Plus size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-800">Send </span>
                </button>

                <button
                  onClick={() => {
                    setFlowState("bills");
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1">
                      <span className="text-sm font-extrabold">N</span>
                    </div>

                    <span className="text-[11px] font-bold text-zinc-800">
                      Bills
                    </span>
                </button>

                <button
                 type="button"
                 onClick={() => {
                  setFlowState("subscription");
                 }}
                 className="flex flex-col items-center justify-center p-3 rounded-2x1 bg-white/80 shadow-sm border border-white/50"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1">
                    <span className="text-sm font-extrabold">
                      @
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-zinc-800">
                    Subscriptions
                  </span>
                </button>

                <button
                  type="button"
                 onClick={() => {
                   setFlowState("security");
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-white/50"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1">
                    <ShieldCheck size={18} />
                  </div>

                  <span className="text-[11px] font-bold text-zinc-800">
                    Security
                  </span>
                </button>
              </div>
            </div>
          )}
          
          {/* BILLS DASHBOARD */}
          {flowState === "bills" && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("dashboard")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Bills
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Manage your recurring payments
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Total Outstanding */}
              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-lg">
                <p className="text-xs text-zinc-400">
                  Total Outstanding
                </p>

                <h1 className="text-3xl font-extrabold mt-2">
                  ₦
                  {bills
                    .filter((bill) => bill.status === "Pending")
                    .reduce((total, bill) => total + bill.amount, 0)
                    .toLocaleString()}
                </h1>

                <div className="flex items-center justify-between mt-5">
                  <div>
                    <p className="text-[10px] text-zinc-400">
                      Pending Bills
                    </p>
                    <p className="text-sm font-bold">
                      {bills.filter((bill) => bill.status === "Pending").length}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-400">
                      Paid Bills
                    </p>
                    <p className="text-sm font-bold">
                      {bills.filter((bill) => bill.status === "Paid").length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bills List */}
              <div className="space-y-3">

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900">
                    Your Bills
                  </h3>

                  <span className="text-[10px] text-zinc-400">
                    {bills.length} bills
                  </span>
                </div>

                {bills.map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => {
                      setSelectedBill(bill);
                      setBillPaymentAmount(String(bill.amount));
                      setBillPaymentError("");
                      setFlowState("bill_details");
                    }}
                    className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 flex items-center justify-between text-left active:scale-[0.99] transition"
                  >

                    <div className="flex items-center gap-3">

                      <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                        <span className="text-sm font-extrabold">
                          ₦
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-zinc-900">
                          {bill.provider}
                        </p>

                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {bill.category}
                        </p>

                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Due {bill.dueDate}
                        </p>
                      </div>

                    </div>

                    <div className="text-right">

                      <p className="text-xs font-extrabold text-zinc-900">
                        ₦{bill.amount.toLocaleString()}
                      </p>

                      <span
                        className={`inline-block mt-1 px-2 py-1 rounded-full text-[9px] font-bold ${
                          bill.status === "Paid"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {bill.status}
                      </span>

                    </div>

                  </button>
                ))}

              </div>

              {/* Add Bill */}
              <button
                type="button"
                onClick={() => {
                  setBillProvider("");
                  setBillCategory("");
                  setBillAccountNumber("");
                  setBillAmount("");
                  setBillDueDate("");
                  setBillCreateError("");
                  setFlowState("bill_create");
                }}
                className="w-full rounded-2xl bg-[#FF6B00] py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30"
              >
                + Add New Bill
              </button>

            </div>
          )}

            {flowState === "bill_create" && (
            <div className="min-h-screen bg-zinc-50 px-4 py-6">
              <div className="max-w-md mx-auto">

                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setBillCreateError("");
                      setFlowState("bills");
                    }}
                    className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center"
                  >
                    ←
                  </button>

                  <div>
                    <h1 className="text-xl font-extrabold text-zinc-900">
                      Add New Bill
                    </h1>
                    <p className="text-xs text-zinc-500">
                      Save a bill for quick payment
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 space-y-4">

                  <div>
                    <label className="text-xs font-bold text-zinc-700">
                      Provider
                    </label>

                    <input
                      type="text"
                      value={billProvider}
                      onChange={(e) => setBillProvider(e.target.value)}
                      placeholder="e.g. Ikeja Electric"
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700">
                      Bill Category
                    </label>

                    <select
                      value={billCategory}
                      onChange={(e) => setBillCategory(e.target.value)}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-zinc-200 bg-white outline-none focus:border-orange-500"
                    >
                      <option value="">Select category</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Internet">Internet</option>
                      <option value="TV">TV</option>
                      <option value="Water">Water</option>
                      <option value="Phone">Phone</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700">
                      Account Number
                    </label>

                    <input
                      type="text"
                      value={billAccountNumber}
                      onChange={(e) => setBillAccountNumber(e.target.value)}
                      placeholder="Enter account or customer number"
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700">
                      Amount
                    </label>

                    <input
                      type="number"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="₦0"
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700">
                      Due Date
                    </label>

                    <input
                      type="date"
                      value={billDueDate}
                      onChange={(e) => setBillDueDate(e.target.value)}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-orange-500"
                    />
                  </div>

                  {billCreateError && (
                    <p className="text-sm font-semibold text-red-600">
                      {billCreateError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={createBill}
                    className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
                  >
                    Save Bill
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* BILL DETAILS */}
          {flowState === "bill_details" && selectedBill && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFlowState("bills")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Bill Details
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Review before payment
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Provider Card */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <span className="text-xl font-extrabold">
                    ₦
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-zinc-900 mt-4">
                  {selectedBill.provider}
                </h2>

                <p className="text-xs text-zinc-500 mt-1">
                  {selectedBill.category}
                </p>

                <div className="mt-5">
                  <p className="text-[10px] text-zinc-400">
                    Amount Due
                  </p>

                  <p className="text-3xl font-extrabold text-zinc-900 mt-1">
                    ₦{selectedBill.amount.toLocaleString()}
                  </p>
                </div>

              </div>

              {/* Details */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 space-y-4">

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Account Number
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedBill.accountNumber}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Due Date
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedBill.dueDate}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Status
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      selectedBill.status === "Paid"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {selectedBill.status}
                  </span>
                </div>

              </div>

              {/* Payment Amount */}
              {selectedBill.status === "Pending" && (
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50">

                  <label className="text-xs font-bold text-zinc-800">
                    Payment Amount
                  </label>

                  <div className="flex items-center gap-2 mt-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                    <span className="text-lg font-extrabold text-zinc-700">
                      ₦
                    </span>

                    <input
                      type="number"
                      value={billPaymentAmount}
                      onChange={(e) => {
                        setBillPaymentAmount(e.target.value);
                        setBillPaymentError("");
                      }}
                      className="w-full bg-transparent text-lg font-bold text-zinc-900 outline-none"
                    />
                  </div>

                  {billPaymentError && (
                    <p className="text-xs text-red-500 font-semibold mt-2">
                      {billPaymentError}
                    </p>
                  )}

                </div>
              )}

              {/* Pay Bill */}
              {selectedBill.status === "Pending" && (
                <button
                  type="button"
                  onClick={() => {
                    const amount = Number(billPaymentAmount);

                    if (!Number.isFinite(amount) || amount <= 0) {
                      setBillPaymentError("Enter a valid payment amount.");
                      return;
                    }

                    if (amount > balance) {
                      setBillPaymentError("Insufficient funds in your account.");
                      return;
                    }

                    if (amount > selectedBill.amount) {
                      setBillPaymentError(
                        "Payment cannot exceed the bill amount."
                      );
                      return;
                    }

                    setBillPaymentError("");
                    setBillPaymentPin("");
                    setFlowState("bill_pin");
                  }}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30"
                >
                  Pay ₦{Number(billPaymentAmount || 0).toLocaleString()}
                </button>
              )}

              {/* Back */}
              <button
                type="button"
                onClick={() => setFlowState("bills")}
                className="w-full py-3 rounded-2xl bg-zinc-100 text-zinc-700 font-bold text-sm"
              >
                Back to Bills
              </button>

            </div>
          )}

          {/* BILL PIN */}
          {flowState === "bill_pin" && selectedBill && (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFlowState("bill_details")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Confirm Payment
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Enter your PIN to continue
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <span className="text-lg font-extrabold">
                    ₦
                  </span>
                </div>

                <p className="text-xs text-zinc-500 mt-4">
                  Paying
                </p>

                <h2 className="text-xl font-extrabold text-zinc-900 mt-1">
                  {selectedBill.provider}
                </h2>

                <p className="text-3xl font-extrabold text-zinc-900 mt-4">
                  ₦{Number(billPaymentAmount || 0).toLocaleString()}
                </p>

                <p className="text-xs text-zinc-500 mt-1">
                  {selectedBill.accountNumber}
                </p>

              </div>

              {/* PIN Display */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50">

                <p className="text-center text-xs font-semibold text-zinc-500 mb-5">
                  Enter 4-digit PIN
                </p>

                <div className="flex justify-center gap-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full border-2 ${
                        billPaymentPin.length > index
                          ? "bg-orange-500 border-orange-500"
                          : "border-zinc-300"
                      }`}
                    />
                  ))}
                </div>

                {billPaymentError && (
                  <p className="text-center text-xs text-red-500 font-semibold mt-4">
                    {billPaymentError}
                  </p>
                )}

              </div>

              {/* PIN Keypad */}
              <div className="grid grid-cols-3 gap-3">

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => {
                      if (billPaymentPin.length >= 4) return;

                      const nextPin = billPaymentPin + number.toString();

                      setBillPaymentPin(nextPin);
                      setBillPaymentError("");

                      if (nextPin.length === 4) {
                        executeBillPayment(nextPin);
                      }

                      
                    }}
                    className="h-14 rounded-2xl bg-white/80 shadow-sm border border-white/50 text-lg font-bold text-zinc-900 active:scale-95 transition"
                  >
                    {number}
                  </button>
                ))}

                {/* Empty */}
                <div />

                {/* Zero */}
                <button
                  type="button"
                  onClick={() => {
                    if (billPaymentPin.length >= 4) return;

                    const nextPin = billPaymentPin + "0";

                    setBillPaymentPin(nextPin);
                    setBillPaymentError("");

                    if(nextPin.length === 4) {
                      executeBillPayment(nextPin);
                    }
                    
                    
                  }}
                  className="h-14 rounded-2xl bg-white/80 shadow-sm border border-white/50 text-lg font-bold text-zinc-900 active:scale-95 transition"
                >
                  0
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => {
                    setBillPaymentPin((prev) => prev.slice(0, -1));
                    setBillPaymentError("");
                  }}
                  className="h-14 rounded-2xl bg-zinc-100 text-zinc-700 font-bold active:scale-95 transition"
                >
                  ←
                </button>

              </div>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => {
                  setBillPaymentPin("");
                  setBillPaymentError("");
                  setFlowState("bill_details");
                }}
                className="w-full py-3 rounded-2xl bg-zinc-100 text-zinc-700 font-bold text-sm"
              >
                Back to Bill
              </button>

            </div>
          )}

          {/* BILL SUCCESS */}
          {flowState === "bill_success" && selectedBill && (
          <div className="space-y-5">

            {/* Success Icon */}
            <div className="pt-8 text-center">

              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <span className="text-3xl font-extrabold">
                  ✓
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-zinc-900 mt-5">
                Payment Successful
              </h1>

              <p className="text-sm text-zinc-500 mt-2">
                Your bill payment has been completed successfully.
              </p>

            </div>

            {/* Payment Summary */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50">

              <div className="text-center">

                <p className="text-xs text-zinc-500">
                  Amount Paid
                </p>

                <p className="text-3xl font-extrabold text-zinc-900 mt-1">
                  ₦{Number(billPaymentAmount || 0).toLocaleString()}
                </p>

              </div>

              <div className="mt-6 space-y-4">

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Provider
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedBill.provider}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Category
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedBill.category}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Account Number
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedBill.accountNumber}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Status
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                    Paid
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Reference
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {lastBillPaymentRef}
                  </span>
                </div>

              </div>

            </div>

            {/* Done */}
            <button
              type="button"
              onClick={() => {
                setSelectedBill(null);
                setBillPaymentAmount("");
                setBillPaymentPin("");
                setBillPaymentError("");
                setFlowState("bills");
              }}
              className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30"
            >
              Done
            </button>

          </div>
          )}

          {flowState === "savings" && (
            <div className="min-h-screen bg-zinc-50 pb-24">
              <div className="px-5 pt-6">
                <button
                  type="button"
                  onClick={() => setFlowState("dashboard")}
                  className="text-sm font-bold text-zinc-600"
                >
                  ← Back
                </button>

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                    AZA Savings
                  </p>

                  <h1 className="mt-1 text-2xl font-extrabold text-zinc-900">
                    Save your way
                  </h1>

                  <p className="mt-2 text-sm text-zinc-500">
                    Build long-term savings automatically or set money aside for
                    unexpected expenses.
                  </p>
                </div>

                {/* LOCKED SAVINGS */}
                <div className="mt-6">
                  <div className="rounded-3xl bg-zinc-900 p-5 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-orange-400">
                          🔒 Locked Savings
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          Automatic 2% savings
                        </p>
                      </div>

                      <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-bold text-orange-400">
                        300 DAYS
                      </span>
                    </div>

                    {savings ? (
                      <>
                        <p className="mt-5 text-3xl font-extrabold">
                          ₦{savings.amount.toLocaleString()}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          Automatically accumulated from qualifying transactions.
                        </p>

                        <div className="mt-5 rounded-2xl bg-white/10 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-400">
                              Expected at maturity
                            </p>

                            <p className="text-sm font-extrabold">
                              ₦{savingsMaturityValue.toLocaleString()}
                            </p>
                          </div>

                          <p className="mt-1 text-xs text-zinc-500">
                            Includes ₦{savingsInterest.toLocaleString()} estimated
                            interest.
                          </p>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-400">
                              Savings progress
                            </p>

                            <p className="text-xs font-bold text-white">
                              {savingsProgress.toFixed(0)}%
                            </p>
                          </div>

                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#FF6B00] transition-all duration-500"
                              style={{
                                width: `${savingsProgress}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white/10 p-4">
                            <p className="text-xs text-zinc-400">
                              Days remaining
                            </p>

                            <p className="mt-1 text-lg font-extrabold">
                              {savingsIsMatured
                                ? "Matured"
                                : `${savingsDaysRemaining} days`}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white/10 p-4">
                            <p className="text-xs text-zinc-400">
                              Maturity date
                            </p>

                            <p className="mt-1 text-sm font-extrabold">
                              {savings.maturityDate}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-xs text-zinc-400">
                              Interest
                            </p>

                            <p className="mt-1 font-bold">
                              {savings.interestRate}%
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-xs text-zinc-400">
                              Status
                            </p>

                            <p className="mt-1 font-bold text-orange-400">
                              {savings.status}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 rounded-2xl bg-white/10 p-4">
                        <p className="text-sm font-bold text-white">
                          No automatic savings yet
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                          AZA automatically moves 2% of qualifying completed
                          transactions into Locked Savings.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RAINY DAY SAVINGS */}
                <div className="mt-5">
                  <div className="rounded-3xl bg-white p-5 border border-zinc-100 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                          <span className="text-lg">🌧️</span>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                            Rainy Day Savings
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Your emergency fund
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600">
                        FLEXIBLE
                      </span>
                    </div>

                    <p className="mt-5 text-3xl font-extrabold text-zinc-900">
                      {hideBalance
                        ? "••••••"
                        : `₦${rainyDaySavingsTotal.toLocaleString()}`}
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Money you intentionally set aside for unexpected expenses.
                    </p>

                    <div className="mt-5 flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                      <div>
                        <p className="text-xs text-zinc-400">
                          Total deposits
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-zinc-900">
                          {rainyDaySavings.length}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-zinc-400">
                          Status
                        </p>

                        <p className="mt-1 text-sm font-extrabold text-emerald-600">
                          Active
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSavingsAmount("");
                        setSavingsError("");
                        setFlowState("savings_create");
                      }}
                      className="mt-5 w-full rounded-2xl bg-[#FF6B00] py-4 text-sm font-bold text-white shadow-sm active:scale-[0.98] transition"
                    >
                      + Add Money to Rainy Day Savings
                    </button>
                  </div>
                </div>

                {/* SAVINGS EXPLANATION */}
                <div className="mt-5 rounded-3xl bg-orange-50 p-5 border border-orange-100">
                  <p className="text-sm font-bold text-zinc-900">
                    Two ways to save with AZA
                  </p>

                  <div className="mt-4 space-y-4">
                    <div className="flex gap-3">
                      <span className="text-lg">🔒</span>

                      <div>
                        <p className="text-sm font-bold text-zinc-900">
                          Locked Savings
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                          AZA automatically saves 2% of qualifying completed
                          transactions. Your money remains locked for 300 days.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="text-lg">🌧️</span>

                      <div>
                        <p className="text-sm font-bold text-zinc-900">
                          Rainy Day Savings
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                          Add money whenever you want and build an emergency fund
                          through repeatable deposits.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

                      {/* RAINY DAY SAVINGS CREATE */}
          {flowState === "savings_create" && (
            <div className="min-h-screen bg-zinc-50 pb-24">
              <div className="px-5 pt-6">
                <button
                  type="button"
                  onClick={() => setFlowState("savings")}
                  className="text-sm font-bold text-zinc-600"
                >
                  ← Back
                </button>

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                    Rainy Day Savings
                  </p>

                  <h1 className="mt-1 text-2xl font-extrabold text-zinc-900">
                    Put money aside
                  </h1>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    Build an emergency fund by setting money aside whenever you
                    choose. You can make multiple deposits over time.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {/* AVAILABLE BALANCE */}
                  <div className="rounded-3xl bg-zinc-900 p-5 text-white">
                    <p className="text-xs font-semibold text-zinc-400">
                      Available balance
                    </p>

                    <p className="mt-2 text-3xl font-extrabold">
                      {hideBalance
                        ? "••••••"
                        : `₦${balance.toLocaleString()}`}
                    </p>

                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      This is the amount currently available in your AZA account
                      for this deposit.
                    </p>
                  </div>

                  {/* AMOUNT */}
                  <div className="rounded-3xl bg-white p-5 border border-zinc-100">
                    <label className="text-sm font-bold text-zinc-800">
                      Amount to save
                    </label>

                    <div className="mt-3 flex items-center rounded-2xl bg-zinc-50 border border-zinc-200 px-4">
                      <span className="text-lg font-extrabold text-zinc-500">
                        ₦
                      </span>

                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={savingsAmount}
                        onChange={(e) => {
                          setSavingsAmount(e.target.value);
                          setSavingsError("");
                        }}
                        placeholder="Enter amount"
                        className="w-full bg-transparent px-3 py-4 text-lg font-bold outline-none"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-zinc-400">
                        Rainy Day Savings balance
                      </p>

                      <p className="text-xs font-bold text-zinc-700">
                        {hideBalance
                          ? "••••••"
                          : `₦${rainyDaySavingsTotal.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* QUICK AMOUNTS */}
                  <div className="rounded-3xl bg-white p-5 border border-zinc-100">
                    <p className="text-sm font-bold text-zinc-800">
                      Quick amount
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[5000, 10000, 25000].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            setSavingsAmount(String(amount));
                            setSavingsError("");
                          }}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 py-3 text-xs font-bold text-zinc-700 active:scale-95 transition"
                        >
                          ₦{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* INFORMATION */}
                  <div className="rounded-3xl bg-orange-50 p-5 border border-orange-100">
                    <div className="flex gap-3">
                      <span className="text-lg">🌧️</span>

                      <div>
                        <p className="text-sm font-bold text-zinc-900">
                          Flexible savings
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                          Rainy Day Savings is separate from your automatic Locked
                          Savings. You choose when and how much to deposit.
                        </p>

                        <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                          You can make another deposit whenever you want. There is
                          no 300-day lock on these funds.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ERROR */}
                  {savingsError && (
                    <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                      <p className="text-sm font-semibold text-red-600">
                        {savingsError}
                      </p>
                    </div>
                  )}

                  {/* DEPOSIT BUTTON */}
                  <button
                    type="button"
                    onClick={createSavings}
                    disabled={
                      !savingsAmount ||
                      Number(savingsAmount) <= 0 ||
                      Number(savingsAmount) > balance
                    }
                    className="w-full rounded-2xl bg-[#FF6B00] py-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] transition"
                  >
                    Add to Rainy Day Savings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBSCRIPTIONS DASHBOARD */}
          {flowState === "subscription" && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFlowState("dashboard")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Subscriptions
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Manage your recurring payments
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Monthly Summary */}
              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-lg">

                <p className="text-xs text-zinc-400">
                  Monthly subscriptions
                </p>

                <h1 className="text-3xl font-extrabold mt-1">
                  ₦
                  {subscriptions
                    .filter((subscription) => subscription.status === "Active")
                    .reduce((total, subscription) => {
                      if (subscription.billingCycle === "Monthly") {
                        return total + subscription.amount;
                      }

                      return total + subscription.amount / 12;
                    }, 0)
                    .toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                </h1>

                <div className="flex items-center justify-between mt-5">

                  <div>
                    <p className="text-[10px] text-zinc-400">
                      Active
                    </p>

                    <p className="text-sm font-bold">
                      {
                        subscriptions.filter(
                          (subscription) =>
                            subscription.status === "Active"
                        ).length
                      }
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400">
                      Total subscriptions
                    </p>

                    <p className="text-sm font-bold">
                      {subscriptions.length}
                    </p>
                  </div>

                </div>
              </div>

              {/* Subscription List */}
              <div className="space-y-3">

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-zinc-900">
                    Your Subscriptions
                  </h3>

                  <span className="text-[10px] font-bold text-zinc-400">
                    {subscriptions.length} subscriptions
                  </span>
                </div>

                {subscriptions.map((subscription) => (
                  <button
                    key={subscription.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setFlowState("subscription_details");
                    }}
                    className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 flex items-center justify-between text-left active:scale-[0.99] transition"
                  >

                    <div className="flex items-center gap-3">

                      <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <span className="text-sm font-extrabold">
                          $
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-zinc-900">
                          {subscription.name}
                        </p>

                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {subscription.category}
                        </p>

                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Next payment {subscription.nextPayment}
                        </p>
                      </div>

                    </div>

                    <div className="text-right">

                      <p className="text-xs font-extrabold text-zinc-900">
                        ₦{subscription.amount.toLocaleString()}
                      </p>

                      <span
                        className={`inline-block mt-1 px-2 py-1 rounded-full text-[9px] font-bold ${
                          subscription.status === "Active"
                            ? "bg-emerald-100 text-emerald-600"
                            : subscription.status === "Paused"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {subscription.status}
                      </span>

                    </div>

                  </button>
                ))}

              </div>

              {/* Add Subscription */}
              <button
                type="button"
                onClick={() => {
                  setFlowState("subscription_create");
                }}
                className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                + Add New Subscription
              </button>

            </div>
          )}

          {/* SUBSCRIPTION DETAILS */}
          {flowState === "subscription_details" && selectedSubscription && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFlowState("subscription")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Subscription Details
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Manage your subscription
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Provider Card */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <span className="text-xl font-extrabold">
                    $
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-zinc-900 mt-4">
                  {selectedSubscription.name}
                </h2>

                <p className="text-xs text-zinc-500 mt-1">
                  {selectedSubscription.provider}
                </p>

                <div className="mt-5">
                  <p className="text-[10px] text-zinc-400">
                    Subscription Cost
                  </p>

                  <p className="text-3xl font-extrabold text-zinc-900 mt-1">
                    ₦{selectedSubscription.amount.toLocaleString()}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {selectedSubscription.billingCycle}
                  </p>
                </div>

              </div>

              {/* Subscription Information */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 space-y-4">

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Category
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedSubscription.category}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Billing Cycle
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedSubscription.billingCycle}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Next Payment
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedSubscription.nextPayment}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Status
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      selectedSubscription.status === "Active"
                        ? "bg-emerald-100 text-emerald-600"
                        : selectedSubscription.status === "Paused"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {selectedSubscription.status}
                  </span>
                </div>

              </div>

              {/* Pay Subscription */}
              {selectedSubscription.status === "Active" && (
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionPaymentAmount(
                      selectedSubscription.amount.toString()
                    );
                    setSubscriptionPaymentPin("");
                    setSubscriptionPaymentError("");
                    setFlowState("subscription_payment");
                  }}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
                >
                  Pay Subscription
                </button>
              )}

              {/* Actions */}
              {selectedSubscription.status === "Active" && (
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptions((prev) =>
                      prev.map((subscription) =>
                        subscription.id === selectedSubscription.id
                          ? {
                              ...subscription,
                              status: "Paused",
                            }
                          : subscription
                      )
                    );

                    setSelectedSubscription((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: "Paused",
                          }
                        : prev
                    );
                  }}
                  className="w-full py-4 rounded-2xl bg-orange-100 text-orange-700 font-bold text-sm"
                >
                  Pause Subscription
                </button>
              )}

              {selectedSubscription.status === "Paused" && (
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptions((prev) =>
                      prev.map((subscription) =>
                        subscription.id === selectedSubscription.id
                          ? {
                              ...subscription,
                              status: "Active",
                            }
                          : subscription
                      )
                    );

                    setSelectedSubscription((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: "Active",
                          }
                        : prev
                    );
                  }}
                  className="w-full py-4 rounded-2xl bg-emerald-100 text-emerald-700 font-bold text-sm"
                >
                  Resume Subscription
                </button>
              )}

              {selectedSubscription.status !== "Cancelled" && (
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptions((prev) =>
                      prev.map((subscription) =>
                        subscription.id === selectedSubscription.id
                          ? {
                              ...subscription,
                              status: "Cancelled",
                            }
                          : subscription
                      )
                    );

                    setSelectedSubscription((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: "Cancelled",
                          }
                        : prev
                    );
                  }}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold text-sm"
                >
                  Cancel Subscription
                </button>
              )}

              {/* Back */}
              <button
                type="button"
                onClick={() => setFlowState("subscription")}
                className="w-full py-3 rounded-2xl bg-zinc-100 text-zinc-700 font-bold text-sm"
              >
                Back to Subscriptions
              </button>

            </div>
          )}

          {/* CREATE SUBSCRIPTION */}
          {flowState === "subscription_create" && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionError("");
                    setFlowState("subscription");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Add Subscription
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Add a recurring payment
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Form */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 space-y-4">

                {/* Subscription Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Subscription Name
                  </label>

                  <input
                    type="text"
                    value={subscriptionName}
                    onChange={(e) => setSubscriptionName(e.target.value)}
                    placeholder="e.g. Netflix Premium"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-100 border border-zinc-200 outline-none text-sm"
                  />
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Provider
                  </label>

                  <input
                    type="text"
                    value={subscriptionProvider}
                    onChange={(e) => setSubscriptionProvider(e.target.value)}
                    placeholder="e.g. Netflix"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-100 border border-zinc-200 outline-none text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Category
                  </label>

                  <select
                    value={subscriptionCategory}
                    onChange={(e) => setSubscriptionCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-100 border border-zinc-200 outline-none text-sm"
                  >
                    <option value="">Select category</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Technology">Technology</option>
                    <option value="Bills & Utilities">Bills & Utilities</option>
                    <option value="Education">Education</option>
                    <option value="Health & Fitness">Health & Fitness</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Amount
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                      ₦
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={subscriptionAmount}
                      onChange={(e) => setSubscriptionAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-zinc-100 border border-zinc-200 outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Billing Cycle */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Billing Cycle
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSubscriptionBillingCycle("Monthly")}
                      className={`py-3 rounded-2xl text-sm font-bold ${
                        subscriptionBillingCycle === "Monthly"
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      Monthly
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubscriptionBillingCycle("Yearly")}
                      className={`py-3 rounded-2xl text-sm font-bold ${
                        subscriptionBillingCycle === "Yearly"
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                {/* Next Payment */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Next Payment Date
                  </label>

                  <input
                    type="date"
                    value={subscriptionNextPayment}
                    onChange={(e) => setSubscriptionNextPayment(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-100 border border-zinc-200 outline-none text-sm"
                  />
                </div>

                {/* Error */}
                {subscriptionError && (
                  <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-xs font-semibold text-red-600">
                      {subscriptionError}
                    </p>
                  </div>
                )}

                {/* Save */}
                <button
                  type="button"
                  onClick={() => {
                    const amount = Number(subscriptionAmount);

                    if (!subscriptionName.trim()) {
                      setSubscriptionError("Enter a subscription name.");
                      return;
                    }

                    if (!subscriptionProvider.trim()) {
                      setSubscriptionError("Enter the provider name.");
                      return;
                    }

                    if (!subscriptionCategory) {
                      setSubscriptionError("Select a category.");
                      return;
                    }

                    if (!Number.isFinite(amount) || amount <= 0) {
                      setSubscriptionError("Enter a valid subscription amount.");
                      return;
                    }

                    if (!subscriptionNextPayment) {
                      setSubscriptionError("Select the next payment date.");
                      return;
                    }

                    const newSubscription: subscription = {
                      id: `${Date.now()}-${Math.random()}`,
                      name: subscriptionName.trim(),
                      provider: subscriptionProvider.trim(),
                      category: subscriptionCategory,
                      amount,
                      billingCycle: subscriptionBillingCycle,
                      nextPayment: new Date(
                        `${subscriptionNextPayment}T00:00:00`
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }),
                      status: "Active",
                    };

                    setSubscriptions((prev) => [
                      newSubscription,
                      ...prev,
                    ]);

                    
                    setSubscriptionError("");

                    setFlowState("subscription_success");
                  }}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
                >
                  Save Subscription
                </button>

              </div>

            </div>
          )}

          {/* SUBSCRIPTION SUCCESS */}
          {flowState === "subscription_success" && (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="w-9"></div>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Subscription Added
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Your subscription is now active
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Success Card */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                {/* Success Icon */}
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check size={34} strokeWidth={3} />
                </div>

                <h2 className="text-2xl font-extrabold text-zinc-900 mt-5">
                  Subscription Added
                </h2>

                <p className="text-sm text-zinc-500 mt-2">
                  Your recurring payment has been added successfully.
                </p>

                {/* Subscription Summary */}
                <div className="mt-6 bg-zinc-50 rounded-2xl p-4 text-left space-y-3">

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Subscription
                    </span>

                    <span className="text-xs font-bold text-zinc-900">
                      {subscriptionName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Provider
                    </span>

                    <span className="text-xs font-bold text-zinc-900">
                      {subscriptionProvider}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Amount
                    </span>

                    <span className="text-sm font-extrabold text-zinc-900">
                      ₦{Number(subscriptionAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Billing Cycle
                    </span>

                    <span className="text-xs font-bold text-zinc-900">
                      {subscriptionBillingCycle}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Status
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                      Active
                    </span>
                  </div>

                </div>

              </div>

              {/* Continue */}
              <button
                type="button"
                onClick={() => {
                  setFlowState("subscription");
                }}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
              >
                Back to Subscriptions
              </button>

            </div>
          )}

          {/* SUBSCRIPTION PAYMENT */}
          {flowState === "subscription_payment" && selectedSubscription && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionPaymentError("");
                    setFlowState("subscription_details");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Pay Subscription
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Confirm your recurring payment
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Subscription Summary */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <span className="text-xl font-extrabold">
                    ↻
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-zinc-900 mt-4">
                  {selectedSubscription.name}
                </h2>

                <p className="text-xs text-zinc-500 mt-1">
                  {selectedSubscription.provider}
                </p>

                <div className="mt-5">
                  <p className="text-[10px] text-zinc-400">
                    Payment Amount
                  </p>

                  <p className="text-3xl font-extrabold text-zinc-900 mt-1">
                    ₦{selectedSubscription.amount.toLocaleString()}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {selectedSubscription.billingCycle} subscription
                  </p>
                </div>

              </div>

              {/* Payment Amount */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50">

                <label className="block text-xs font-bold text-zinc-700 mb-2">
                  Amount to Pay
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                    ₦
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={subscriptionPaymentAmount}
                    onChange={(e) => {
                      setSubscriptionPaymentAmount(e.target.value);
                      setSubscriptionPaymentError("");
                    }}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-4 rounded-2xl bg-zinc-100 border border-zinc-200 outline-none text-lg font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSubscriptionPaymentAmount(
                      selectedSubscription.amount.toString()
                    )
                  }
                  className="mt-3 text-xs font-bold text-orange-600"
                >
                  Use subscription amount
                </button>

              </div>

              {/* Account Balance */}
              <div className="bg-zinc-900 rounded-3xl p-5 text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-zinc-400">
                    Available Balance
                  </p>

                  <p className="text-lg font-extrabold mt-1">
                    ₦{balance.toLocaleString()}
                  </p>
                </div>

                <div className="text-xs text-zinc-400">
                  AZA Wallet
                </div>
              </div>

              {/* Error */}
              {subscriptionPaymentError && (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-xs font-semibold text-red-600">
                    {subscriptionPaymentError}
                  </p>
                </div>
              )}

              {/* Continue */}
              <button
                type="button"
                onClick={() => {
                  const amount = Number(subscriptionPaymentAmount);

                  if (!Number.isFinite(amount) || amount <= 0) {
                    setSubscriptionPaymentError(
                      "Enter a valid payment amount."
                    );
                    return;
                  }

                  if (amount > balance) {
                    setSubscriptionPaymentError(
                      "Insufficient funds in your account."
                    );
                    return;
                  }

                  if (amount > selectedSubscription.amount) {
                    setSubscriptionPaymentError(
                      "Payment cannot exceed the subscription amount."
                    );
                    return;
                  }

                  setSubscriptionPaymentError("");
                  setSubscriptionPaymentPin("");
                  setFlowState("subscription_payment_pin");
                }}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
              >
                Continue to PIN
              </button>

            </div>
          )}

          {/* SUBSCRIPTION PAYMENT PIN */}
          {flowState === "subscription_payment_pin" && selectedSubscription && (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionPaymentPin("");
                    setSubscriptionPaymentError("");
                    setFlowState("subscription_payment");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Enter PIN
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Authorize subscription payment
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                <p className="text-xs text-zinc-500">
                  Paying
                </p>

                <h2 className="text-lg font-extrabold text-zinc-900 mt-1">
                  {selectedSubscription.name}
                </h2>

                <p className="text-3xl font-extrabold text-zinc-900 mt-4">
                  ₦{Number(subscriptionPaymentAmount).toLocaleString()}
                </p>

                <p className="text-xs text-zinc-500 mt-1">
                  {selectedSubscription.provider}
                </p>

              </div>

              {/* PIN Dots */}
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      index < subscriptionPaymentPin.length
                        ? "bg-zinc-900 border-zinc-900"
                        : "bg-transparent border-zinc-300"
                    }`}
                  />
                ))}
              </div>

              {/* Error */}
              {subscriptionPaymentError && (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-xs font-semibold text-red-600 text-center">
                    {subscriptionPaymentError}
                  </p>
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto w-full">

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => {
                      if (subscriptionPaymentPin.length >= 4) return;

                      const nextPin =
                        subscriptionPaymentPin + number.toString();

                      setSubscriptionPaymentPin(nextPin);
                      setSubscriptionPaymentError("");

                      if (nextPin.length === 4) {
                        executeSubscriptionPayment(nextPin);
                      }
                    }}
                    className="h-16 rounded-2xl bg-white/80 shadow-sm border border-white/50 text-lg font-extrabold text-zinc-900 active:scale-95 transition"
                  >
                    {number}
                  </button>
                ))}

                {/* Empty */}
                <div></div>

                {/* Zero */}
                <button
                  type="button"
                  onClick={() => {
                    if (subscriptionPaymentPin.length >= 4) return;

                    const nextPin = subscriptionPaymentPin + "0";

                    setSubscriptionPaymentPin(nextPin);
                    setSubscriptionPaymentError("");

                    if (nextPin.length === 4) {
                      executeSubscriptionPayment(nextPin);
                    }
                  }}
                  className="h-16 rounded-2xl bg-white/80 shadow-sm border border-white/50 text-lg font-extrabold text-zinc-900 active:scale-95 transition"
                >
                  0
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionPaymentPin((prev) =>
                      prev.slice(0, -1)
                    );
                    setSubscriptionPaymentError("");
                  }}
                  className="h-16 rounded-2xl bg-zinc-100 text-zinc-700 font-bold active:scale-95 transition"
                >
                  Delete
                </button>

              </div>

              {/* Back */}
              <button
                type="button"
                onClick={() => {
                  setSubscriptionPaymentPin("");
                  setSubscriptionPaymentError("");
                  setFlowState("subscription_payment");
                }}
                className="w-full py-3 rounded-2xl bg-zinc-100 text-zinc-700 font-bold text-sm"
              >
                Back to Payment
              </button>

            </div>
          )}

          
        {/* SUBSCRIPTION PAYMENT SUCCESS */}
        {flowState === "subscription_payment_success" &&
          selectedSubscription && (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="w-9"></div>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Payment Complete
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Subscription payment successful
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Success Card */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 text-center">

                {/* Success Icon */}
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check size={34} strokeWidth={3} />
                </div>

                <h2 className="text-2xl font-extrabold text-zinc-900 mt-5">
                  Payment Successful
                </h2>

                <p className="text-sm text-zinc-500 mt-2">
                  Your subscription payment has been processed.
                </p>

                {/* Amount */}
                <div className="mt-6">
                  <p className="text-[10px] text-zinc-400">
                    Amount Paid
                  </p>

                  <p className="text-3xl font-extrabold text-zinc-900 mt-1">
                    ₦{Number(subscriptionPaymentAmount).toLocaleString()}
                  </p>
                </div>

                {/* Details */}
                <div className="mt-6 bg-zinc-50 rounded-2xl p-4 text-left space-y-3">

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Subscription
                    </span>

                    <span className="text-xs font-bold text-zinc-900">
                      {selectedSubscription.name}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Provider
                    </span>

                    <span className="text-xs font-bold text-zinc-900">
                      {selectedSubscription.provider}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Category
                    </span>

                    <span className="text-xs font-bold text-zinc-900">
                      {selectedSubscription.category}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Status
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                      Successful
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      Reference
                    </span>

                    <span className="text-[10px] font-bold text-zinc-900">
                      {lastSubscriptionPaymentRef}
                    </span>
                  </div>

                </div>

              </div>

              {/* Done */}
              <button
                type="button"
                onClick={() => {
                  setSubscriptionPaymentAmount("");
                  setSubscriptionPaymentPin("");
                  setSubscriptionPaymentError("");
                  setLastSubscriptionPaymentRef("");
                  setFlowState("subscription");
                }}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
              >
                Done
              </button>

            </div>
          )}

          {/* SECURITY DASHBOARD */}
          {flowState === "security" && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFlowState("dashboard")}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Security & Fraud
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Monitor and protect your AZA account
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Security Status */}
              <div className="bg-zinc-900 rounded-3xl p-5 text-white">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-[10px] text-zinc-400">
                      Account Security
                    </p>

                    <h2 className="text-xl font-extrabold mt-1">
                      {accountSecurityStatus}
                    </h2>
                  </div>

                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck size={25} />
                  </div>

                </div>

                <p className="text-xs text-zinc-400 mt-4">
                  AZA continuously monitors your account for unusual
                  transactions and suspicious activity.
                </p>

              </div>

              {/* Security Overview */}
              <div className="grid grid-cols-2 gap-3">

                <div className="bg-white/80 rounded-3xl p-4 shadow-sm border border-white/50">
                  <p className="text-[10px] text-zinc-400">
                    Open Alerts
                  </p>

                  <p className="text-2xl font-extrabold text-zinc-900 mt-1">
                    {
                      securityAlerts.filter(
                        (alert) => alert.status === "Open"
                      ).length
                    }
                  </p>
                </div>

                <div className="bg-white/80 rounded-3xl p-4 shadow-sm border border-white/50">
                  <p className="text-[10px] text-zinc-400">
                    Account Risk
                  </p>

                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    Low
                  </p>
                </div>

              </div>

              {/* Security Alerts */}
              <div className="space-y-3">

                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-zinc-900">
                    Security Alerts
                  </h3>

                  <span className="text-[10px] font-bold text-zinc-400">
                    {securityAlerts.length} total
                  </span>
                </div>

                {securityAlerts.length === 0 ? (
                  <div className="bg-white/80 rounded-3xl p-6 text-center shadow-sm border border-white/50">
                    <ShieldCheck
                      size={28}
                      className="mx-auto text-emerald-500"
                    />

                    <p className="text-sm font-bold text-zinc-900 mt-3">
                      No security alerts
                    </p>

                    <p className="text-xs text-zinc-500 mt-1">
                      Your account has no unresolved security issues.
                    </p>
                  </div>
                ) : (
                  securityAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        setSelectedSecurityAlert(alert);
                        setSecurityActionMessage("");
                        setFlowState("security_alert");
                      }}
                      className="w-full text-left bg-white/80 rounded-3xl p-4 shadow-sm border border-white/50"
                    >
                      <div className="flex items-start gap-3">

                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            alert.severity === "High"
                              ? "bg-red-100 text-red-600"
                              : alert.severity === "Medium"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          <ShieldAlert size={18} />
                        </div>

                        <div className="flex-1 min-w-0">

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-900">
                              {alert.title}
                            </p>

                            <span
                              className={`px-2 py-1 rounded-full text-[9px] font-bold shrink-0 ${
                                alert.severity === "High"
                                  ? "bg-red-100 text-red-600"
                                  : alert.severity === "Medium"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-500 mt-1">
                            {alert.description}
                          </p>

                          <p className="text-[10px] text-zinc-400 mt-2">
                            {alert.time}
                          </p>

                        </div>

                      </div>
                    </button>
                  ))
                )}

              </div>

              {/* Protection Information */}
              <div className="bg-orange-50 rounded-3xl p-5 border border-orange-100">

                <div className="flex items-start gap-3">

                  <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <LockKeyhole size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      AZA Protection
                    </p>

                    <p className="text-xs text-zinc-600 mt-1 leading-5">
                      Your transactions are monitored for unusual
                      activity. If AZA detects something suspicious,
                      you'll be alerted immediately.
                    </p>
                  </div>

                </div>

              </div>

            </div>
          )} 

          {/* SECURITY ALERT DETAILS */}
          {flowState === "security_alert" && selectedSecurityAlert && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFlowState("security");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Security Alert
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Review account activity
                  </p>
                </div>

                <div className="w-9"></div>
              </div>

              {/* Alert Card */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50">

                <div className="flex justify-center">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      selectedSecurityAlert.severity === "High"
                        ? "bg-red-100 text-red-600"
                        : selectedSecurityAlert.severity === "Medium"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    <ShieldAlert size={28} />
                  </div>
                </div>

                <div className="text-center mt-4">

                  <h2 className="text-xl font-extrabold text-zinc-900">
                    {selectedSecurityAlert.title}
                  </h2>

                  <div className="mt-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        selectedSecurityAlert.severity === "High"
                          ? "bg-red-100 text-red-600"
                          : selectedSecurityAlert.severity === "Medium"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {selectedSecurityAlert.severity} Risk
                    </span>
                  </div>

                </div>

                <div className="mt-6 bg-zinc-50 rounded-2xl p-4">
                  <p className="text-xs leading-5 text-zinc-600">
                    {selectedSecurityAlert.description}
                  </p>
                </div>
              {selectedSecurityAlert.transactionAmount !== undefined && (
                <div className="mt-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Transaction Details
                  </p>

                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">
                        Type
                      </span>
                      <span className="text-sm font-bold text-zinc-900">
                        {selectedSecurityAlert.transactionType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">
                        Amount
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900">
                        ₦{selectedSecurityAlert.transactionAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">
                        Involved
                      </span>
                      <span className="text-sm font-bold text-zinc-900">
                        {selectedSecurityAlert.transactionName}
                      </span>
                    </div>

                    {selectedSecurityAlert.transactionReference && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-zinc-500">
                          Reference
                        </span>
                        <span className="text-xs font-bold text-zinc-900 text-right break-all">
                          {selectedSecurityAlert.transactionReference}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              </div>

              {/* Alert Information */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 space-y-4">

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Detected
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedSecurityAlert.time}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Severity
                  </span>

                  <span className="text-xs font-bold text-zinc-900">
                    {selectedSecurityAlert.severity}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Status
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      selectedSecurityAlert.status === "Open"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {selectedSecurityAlert.status}
                  </span>
                </div>

              </div>

              {/* Resolve Alert */}

                {selectedSecurityAlert.transactionReference && (
                <button
                  type="button"
                  onClick={() => {
                    const transaction = transactions.find(
                      (tx) =>
                        tx.reference ===
                        selectedSecurityAlert.transactionReference
                    );

                    if (!transaction) {
                      return;
                    }

                    setSelectedTransaction(transaction);
                    setFlowState("transaction_details");
                  }}
                  className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold text-sm shadow-sm"
                >
                  View Transaction
                </button>
              )}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    handleSecurityAction("recognized");
                  }}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-sm"
                  >
                    Yes It's Mine
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSecurityAction("unrecognized");
                  }}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-bold text-sm"
                  >
                  No, I Don't Recognize It
                </button>
              </div> 

              {selectedSecurityAlert.status === "Open" && (
                 <div className="mt-4 p-4 rounded-2xl bg-zinc-100">
                   <p className="text-sm font-semibold text-zinc-700">
                    {securityActionMessage}
                   </p> 
                  </div>
              )}
              

              {/* Back */}
              <button
                type="button"
                onClick={() => {
                  setSelectedSecurityAlert(null);
                  setFlowState("security");
                }}
                className="w-full py-3 rounded-2xl bg-zinc-100 text-zinc-700 font-bold text-sm"
              >
                Back to Security
              </button>

            </div>
          )}

          {/* ACTIVITY TAB */}           
          {flowState === "dashboard" && activeTab === "activity" && (
            <div className="space-y-4">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-zinc-900">
                    Activity
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Your recent wallet transactions
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-white/80 text-[10px] font-bold text-zinc-600 shadow-sm">
                  {transactions.length} Transactions
                </div>
              </div>

              <div className="space-y-2.5">

                {transactions.map((tx) => (

                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      setSelectedTransaction(tx);
                      setFlowState("transaction_details");
                    }}
                    className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 flex justify-between items-center text-left active:scale-[0.99] transition"
                  >

                    <div className="flex items-center gap-3">

                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                          tx.type === "Sent"
                            ? "bg-orange-100 text-orange-600"
                            : tx.type === "Received"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-purple-100 text-purple-600"
                        }`}
                      >
                        {tx.type === "Sent"
                          ? "↑"
                          : tx.type === "Received"
                          ? "↓"
                          : "+"}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-zinc-900">
                          {tx.name}
                        </p>

                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {tx.type} • {tx.time}
                        </p>

                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          {tx.status || "Successful"}
                        </p>
                      </div>

                    </div>

                    <div className="text-right">

                      <span
                        className={`text-xs font-extrabold ${
                          tx.amount > 0
                            ? "text-emerald-600"
                            : "text-zinc-900"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : "-"}₦
                        {Math.abs(tx.amount).toLocaleString()}
                      </span>

                      <p className="text-[9px] text-zinc-400 mt-1">
                        View details →
                      </p>

                    </div>

                  </button>

                ))}

              </div>

            </div>
          )}

          {/* TRANSACTION DETAILS */}
          {flowState === "transaction_details" && selectedTransaction && (
            <div className="space-y-5">

              <div className="flex items-center justify-between">

                <button
                  onClick={() => {
                    setSelectedTransaction(null);
                    setFlowState("dashboard");
                    setActiveTab("activity");
                  }}
                  className="p-2.5 rounded-full bg-white/80 shadow-sm text-zinc-700"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center">
                  <h2 className="font-bold text-lg text-zinc-900">
                    Transaction Details
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Complete transaction information
                  </p>
                </div>

                <div className="w-9"></div>

              </div>


              {/* Amount Card */}

              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/60 text-center">

                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold ${
                    selectedTransaction.type === "Sent"
                      ? "bg-orange-100 text-orange-600"
                      : selectedTransaction.type === "Received"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-purple-100 text-purple-600"
                  }`}
                >
                  {selectedTransaction.type === "Sent"
                    ? "↑"
                    : selectedTransaction.type === "Received"
                    ? "↓"
                    : "+"}
                </div>

                <p className="text-xs text-zinc-400">
                  {selectedTransaction.type}
                </p>

                <h3
                  className={`text-3xl font-extrabold mt-1 ${
                    selectedTransaction.amount > 0
                      ? "text-emerald-600"
                      : "text-zinc-900"
                  }`}
                >
                  {selectedTransaction.amount > 0 ? "+" : "-"}₦
                  {Math.abs(selectedTransaction.amount).toLocaleString()}
                </h3>

                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                  <Check size={12} className="text-emerald-600" />

                  <span className="text-[10px] font-bold text-emerald-600">
                    {selectedTransaction.status || "Successful"}
                  </span>
                </div>

              </div>


              {/* Transaction Information */}

              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50">

                <p className="text-xs font-bold text-zinc-800 mb-4">
                  Transaction Information
                </p>


                <div className="space-y-4">

                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-400">
                      Name
                    </span>

                    <span className="text-xs font-bold text-zinc-800 text-right">
                      {selectedTransaction.name}
                    </span>
                  </div>


                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-400">
                      AZA Tag
                    </span>

                    <span className="text-xs font-bold text-zinc-800 text-right">
                      {selectedTransaction.tag}
                    </span>
                  </div>


                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-400">
                      Type
                    </span>

                    <span className="text-xs font-bold text-zinc-800 text-right">
                      {selectedTransaction.type}
                    </span>
                  </div>


                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-400">
                      Method
                    </span>

                    <span className="text-xs font-bold text-zinc-800 text-right">
                      {selectedTransaction.method || "AZA Wallet"}
                    </span>
                  </div>


                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-400">
                      Date & Time
                    </span>

                    <span className="text-xs font-bold text-zinc-800 text-right">
                      {selectedTransaction.time}
                    </span>
                  </div>


                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-400">
                      Status
                    </span>

                    <span className="text-xs font-bold text-emerald-600 text-right">
                      {selectedTransaction.status || "Successful"}
                    </span>
                  </div>


                  <div className="pt-3 border-t border-zinc-200">

                    <p className="text-[10px] text-zinc-400 mb-1">
                      Transaction Reference
                    </p>

                    <p className="text-xs font-bold text-zinc-800 break-all">
                      {selectedTransaction.reference || "Legacy transaction"}
                    </p>

                  </div>

                </div>

              </div>


              {/* Done Button */}

              <button
                onClick={() => {
                  setSelectedTransaction(null);
                  setFlowState("dashboard");
                  setActiveTab("activity");
                }}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm shadow-lg shadow-orange-500/30"
              >
                Done
              </button>

            </div>
          )}

          {/* BUDGET DASHBOARD */}
          {flowState === "dashboard" && activeTab === "home" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Budgets
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Stay in control of your monthly spending
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingBudget(false);
                    setBudgetError("");
                    setFlowState("budget_details");
                  }}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Manage
                </button>
              </div>

              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-400">
                      Monthly Budget
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      ₦{totalBudgetLimit.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      Remaining
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      ₦{totalBudgetRemaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{
                      width: `${totalBudgetPercentage}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Spent
                  </span>

                  <span className="font-semibold">
                    ₦{totalBudgetSpent.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900">
                  Spending Categories
                </h3>

                <span className="text-xs text-zinc-500">
                  {budgets.length} budgets
                </span>
              </div>

              <div className="space-y-3">
                {budgets.map((budget) => {
                  const percentage =
                    budget.limit > 0
                      ? Math.min(
                          (budget.spent / budget.limit) * 100,
                          100
                        )
                      : 0;

                  return (
                    <div
                      key={budget.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {budget.category}
                          </p>

                          <p className="mt-1 text-[11px] text-zinc-500">
                            ₦{budget.spent.toLocaleString()} spent of ₦
                            {budget.limit.toLocaleString()}
                          </p>
                        </div>

                        <p className="text-xs font-bold text-zinc-900">
                          {Math.round(percentage)}%
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">
                          Remaining
                        </span>

                        <span className="font-semibold text-zinc-900">
                          ₦
                          {Math.max(
                            budget.limit - budget.spent,
                            0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CARDS TAB */}
          {flowState === "dashboard" && activeTab === "cards" && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-zinc-900">Virtual Card</h2>
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 text-white rounded-3xl p-6 shadow-xl space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                  <span className="font-bold text-sm tracking-wider">AZA CARD</span>
                  
                  <div className="mt-1 flex items-center gap-2">
                    <span
                     className={`h-2 w-2 rounded-full ${
                      cardFrozen ? "bg-zinc-400" : "bg-green-400"
                     }`}
                    />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-300">
                      {cardFrozen ? "Frozen" : "Active"}
                    </span> 

                      {cardFrozen && (
                      <div className="mt-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                        <div className="flex items-start gap-3">
                          <ShieldAlert
                            size={20}
                            className="text-red-600 mt-0.5 shrink-0"
                          />

                          <div>
                            <p className="text-sm font-extrabold text-red-700">
                              Card frozen for your protection
                            </p>

                            <p className="text-xs text-red-600 mt-1 leading-relaxed">
                              AZA froze this card after an unrecognized transaction was reported.
                              Review your security alerts before using the card again.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
               </div>

               <ShieldCheck
                 size={20}
                 className={cardFrozen ? "text-zinc-400" : "text-orange-400"}
                />
               </div>    
                <p className="text-lg font-mono tracking-widest">
                   {showCardNumber ? "4009 4821 76434 7908" : "4009 •••• •••• 7908"}
                </p>
                <div className="flex justify-between items-end text-xs">
                  <div>
                    <p className="text-[9px] text-zinc-400 uppercase">Card Holder</p>
                    <p className="font-bold">Alfred Finovate</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-400 uppercase">Expires</p>
                    <p className="font-bold">08/30</p>
                  </div>
                </div>
              </div>

              <button 
                 onClick={() => setShowCardNumber((prev) => !prev)}
                 className="w-full rounded-2x1 border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                {showCardNumber ? "Hide Card Number" : "Show Card Number"}
              </button>

              <button
                 onClick={toggleCardFreeze}
                className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
                  cardFrozen
                   ? "bg-orange-500 text-white"
                   : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                } `}   
              >
                {cardFrozen ? "Unfreese Card" : "Freeze Card"}
              </button>  
              <button
              onClick={() => {
                setShowCardDetails(false);
                setFlowState("card_details");
              }}
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                View Card Details
              </button>

              <button
                onClick={() => {
                  setCardPaymentAmount("");
                  setCardPaymentMerchant("");
                  setCardPaymentError("");
                  setFlowState("card_payment");
                }}
                className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Make Card Payment
                </button>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Spending Limit
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Monthly card spending limit
                  </p>
                </div>

                <p className="text-lg font-bold text-zinc-900">
                  ₦{cardSpendingLimit.toLocaleString()}
                </p>

              </div>

              <div 
              className="h-full rounded-full bg-orange-500 transition-all"
              style ={{
                width: `${Math.min(
                  (cardSpentThisMonth / cardSpendingLimit) * 100,
                  100
                )}%`,
              }}
              />
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: "35%" }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">
                  Spent this month
                </span>

                <span className="font-semibold text-zimc-900">
                  N{cardSpentThisMonth.toLocaleString()}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">
                  Remaining
                </span>  

                <span className="font-semibold text-zinc-900">
                  N{cardRemainingLimit.toLocaleString()}
                </span>
              <button
              onClick={() => {
                setEditingCardLimit(true);
                setCardLimitInput(String(cardSpendingLimit));
                setCardLimitError("");
              }}
              className="mt-4 w-full rounded-xl bg-zinc-980 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Change Limit
              </button>
            </div>
            </div>
           )}  
          {editingCardLimit && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">

              <p className="text-sm font-semibold text-zinc-900">
                Change Spending Limit
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Set your maximum monthly card spending limit.
              </p>

              <div className="mt-4">
                <label className="text-xs font-medium text-zinc-600">
                  Monthly limit
                </label>

                <div className="mt-2 flex items-center rounded-xl border border-zinc-200 px-4">
                  <span className="text-sm text-zinc-500">
                    ₦
                  </span>

                  <input
                    type="number"
                    value={cardLimitInput}
                    onChange={(e) => {
                      setCardLimitInput(e.target.value);
                      setCardLimitError("");
                    }}
                    className="w-full bg-transparent px-2 py-3 text-sm font-semibold outline-none"
                    placeholder="500000"
                  />
                </div>

                {cardLimitError && (
                  <p className="mt-2 text-xs text-red-500">
                    {cardLimitError}
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <button
                  onClick={() => {
                    setEditingCardLimit(false);
                    setCardLimitError("");
                  }}
                  className="rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700"
                >
                  Cancel
                </button>

                <button
                  onClick={updateCardSpendingLimit}
                  className="rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Save Limit
                </button>

              </div>

            </div>
          )}

          {/* BUDGET DETAILS */}
          {flowState === "budget_details" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setBudgetError("");
                    setEditingBudget(false);
                    setFlowState("dashboard");
                    setActiveTab("home");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white"
                >
                  <ArrowLeft size={18} />
                </button>

                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Budget Management
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Manage your monthly spending limits
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
                <p className="text-xs text-zinc-400">
                  Monthly Budget
                </p>

                <p className="mt-2 text-3xl font-bold">
                  ₦{monthlyBudget.toLocaleString()}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      Spent
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      ₦{budgetSpent.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      Remaining
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      ₦
                      {Math.max(
                        monthlyBudget - budgetSpent,
                        0
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Your Budgets
                </h3>

                <p className="mt-1 text-xs text-zinc-500">
                  Select a category to manage its limit.
                </p>
              </div>

              <button
                 onClick={() => {
                  setNewBudgetCategory("");
                  setNewBudgetLimit("");
                  setBudgetError("");
                  setFlowState("budget_create");
                 }}
                 className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                + Create New Budget
              </button>   
              <div className="space-y-3">
                {budgets.map((budget) => {
                  const percentage =
                    budget.limit > 0
                      ? Math.min(
                          (budget.spent / budget.limit) * 100,
                          100
                        )
                      : 0;

                  return (
                    <button
                      key={budget.id}
                      onClick={() => {
                        setBudgetCategory(budget.category);
                        setBudgetCategoryLimit(budget.limit);
                        setBudgetCategorySpent(budget.spent);
                        setBudgetInput(String(budget.limit));
                        setBudgetError("");
                        setEditingBudget(true);
                        setFlowState("budget_edit");
                      }}
                      className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-orange-200 hover:bg-orange-50/30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {budget.category}
                          </p>

                          <p className="mt-1 text-[11px] text-zinc-500">
                            ₦{budget.spent.toLocaleString()} spent
                          </p>
                        </div>

                        <p className="text-xs font-bold text-zinc-900">
                          ₦{budget.limit.toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* EDIT BUDGET */}
          {flowState === "budget_edit" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setBudgetError("");
                    setEditingBudget(false);
                    setFlowState("budget_details");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white"
                >
                  <ArrowLeft size={18} />
                </button>

                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Edit Budget
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Adjust your monthly spending limit
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
                <p className="text-xs text-zinc-400">
                  Budget Category
                </p>

                <p className="mt-2 text-xl font-bold">
                  {budgetCategory}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      Current Limit
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      ₦{budgetCategoryLimit.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      Spent
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      ₦{budgetCategorySpent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <label className="text-xs font-medium text-zinc-600">
                  New Monthly Limit
                </label>

                <div className="mt-2 flex items-center rounded-xl border border-zinc-200 px-4">
                  <span className="text-sm text-zinc-500">
                    ₦
                  </span>

                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => {
                      setBudgetInput(e.target.value);
                      setBudgetError("");
                    }}
                    placeholder="200000"
                    className="w-full bg-transparent px-2 py-4 text-lg font-bold outline-none"
                  />
                </div>

                {budgetError && (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {budgetError}
                  </p>
                )}

                <p className="mt-2 text-[11px] text-zinc-500">
                  Minimum ₦1,000 • Maximum ₦10,000,000
                </p>
              </div>

              <button
                onClick={() => {
                  const newLimit = Number(budgetInput);

                  if (!Number.isFinite(newLimit) || newLimit <= 0) {
                    setBudgetError("Enter a valid budget limit.");
                    return;
                  }

                  if (newLimit < 1000) {
                    setBudgetError("Minimum budget limit is ₦1,000.");
                    return;
                  }

                  if (newLimit > 10000000) {
                    setBudgetError(
                      "Maximum budget limit is ₦10,000,000."
                    );
                    return;
                  }

                  if (newLimit < budgetCategorySpent) {
                    setBudgetError(
                      "Budget limit cannot be lower than the amount already spent."
                    );
                    return;
                  }

                  setBudgets((prev) =>
                    prev.map((budget) =>
                      budget.category === budgetCategory
                        ? {
                            ...budget,
                            limit: newLimit,
                          }
                        : budget
                    )
                  );

                  setBudgetCategoryLimit(newLimit);
                  setBudgetInput("");
                  setBudgetError("");
                  setEditingBudget(false);
                  setFlowState("budget_details");
                }}
                className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Save Budget
              </button>
            </div>
          )}

          {/* CREATE BUDGET */}
          {flowState === "budget_create" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setBudgetError("");
                    setNewBudgetCategory("");
                    setNewBudgetLimit("");
                    setFlowState("budget_details");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white"
                >
                  <ArrowLeft size={18} />
                </button>

                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Create Budget
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Set a spending limit for a category
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
                <p className="text-xs text-zinc-400">
                  New Budget
                </p>

                <p className="mt-2 text-xl font-bold">
                  Plan your spending
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Create a limit to help AZA track and manage your spending.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Budget Category
                  </label>

                  <select
                    value={newBudgetCategory}
                    onChange={(e) => {
                      setNewBudgetCategory(e.target.value);
                      setBudgetError("");
                    }}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm font-semibold text-zinc-900 outline-none"
                  >
                    <option value="">
                      Select a category
                    </option>

                    {[
                      "Food & Dinning",
                      "Transportation",
                      "Bills & Utilities",
                      "Shopping",
                      "Entertainment",
                      "other",
                    ]
                      .filter((category) => {
                        const catagoryExists = budgets.some(
                          (budget) =>
                            budget.category.trim().toLowerCase() ===
                            category.trim().toLocaleLowerCase()
                        );
                        return !catagoryExists;
                      })
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
              

                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-600">
                    Monthly Limit
                  </label>

                  <div className="mt-2 flex items-center rounded-xl border border-zinc-200 px-4">
                    <span className="text-sm text-zinc-500">
                      ₦
                    </span>

                    <input
                      type="number"
                      value={newBudgetLimit}
                      onChange={(e) => {
                        setNewBudgetLimit(e.target.value);
                        setBudgetError("");
                      }}
                      placeholder="200000"
                      className="w-full bg-transparent px-2 py-4 text-lg font-bold outline-none"
                    />
                  </div>
                </div>

                {budgetError && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-500">
                    {budgetError}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  const limit = Number(newBudgetLimit);

                  if (!newBudgetCategory) {
                    setBudgetError("Select a budget category.");
                    return;
                  }

                  if (
                    budgets.some(
                      (budget) =>
                        budget.category === newBudgetCategory
                    )
                  ) {
                    setBudgetError(
                      "A budget for this category already exists."
                    );
                    return;
                  }

                  if (!Number.isFinite(limit) || limit <= 0) {
                    setBudgetError("Enter a valid budget limit.");
                    return;
                  }

                  if (limit < 1000) {
                    setBudgetError(
                      "Minimum budget limit is ₦1,000."
                    );
                    return;
                  }

                  if (limit > 10000000) {
                    setBudgetError(
                      "Maximum budget limit is ₦10,000,000."
                    );
                    return;
                  }

                  setBudgets((prev) => [
                    ...prev,
                    {
                      id: `${Date.now()}-${Math.random()}`,
                      category: newBudgetCategory,
                      limit,
                      spent: 0,
                    },
                  ]);

                  setNewBudgetCategory("");
                  setNewBudgetLimit("");
                  setBudgetError("");
                  setFlowState("budget_details");
                }}
                className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Create Budget
              </button>
            </div>
          )}
         

          {/* CARD DETAILS */}
          {flowState === "card_details" && (
            <div className="space-y-6">

              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowCardDetails(false);
                    setFlowState("dashboard");
                    setActiveTab("cards");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white"
                >
                  <ArrowLeft size={18} />
                </button>

                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Card Details
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Keep your card information secure
                  </p>
                </div>
              </div>

              {/* Card information */}
              <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-wider">
                    AZA CARD
                  </span>

                  <ShieldCheck
                    size={20}
                    className={cardFrozen ? "text-zinc-500" : "text-orange-400"}
                  />
                </div>

                <div className="mt-8">
                  <p className="text-[9px] uppercase text-zinc-500">
                    Card Number
                  </p>

                  <p className="mt-2 font-mono text-lg tracking-widest">
                    4009 4821 7634 7908
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-6">

                  <div>
                    <p className="text-[9px] uppercase text-zinc-500">
                      Expires
                    </p>

                    <p className="mt-2 font-bold">
                      08/30
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase text-zinc-500">
                      CVV
                    </p>

                    <p className="mt-2 font-mono font-bold tracking-widest">
                      {showCardDetails ? "482" : "•••"}
                    </p>
                  </div>

                </div>

              </div>

              {/* Security notice */}
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <div className="flex gap-3">

                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-orange-500"
                  />

                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Keep your card details private
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      Never share your card number, expiry date or CVV
                      with anyone you do not trust.
                    </p>
                  </div>

                </div>
              </div>

              {/* CVV control */}
              <button
                onClick={() => setShowCardDetails((prev) => !prev)}
                className="w-full rounded-2xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                {showCardDetails ? "Hide CVV" : "Show CVV"}
              </button>

            </div>
          )}

          {/* PROFILE TAB */}
          {flowState === "dashboard" && activeTab === "profile" && (
            <div className="space-y-4 pb-28 min-h-full">
              <h2 className="font-bold text-lg text-zinc-900">Profile</h2>
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-200">
                  <div className="w-12 h-12 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-lg">
                    AF
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">Alfred Finovate</h3>
                    <p className="text-xs text-zinc-500">@Finovate_pay</p>
<div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 space-y-4">
  <div>
    <h3 className="font-bold text-sm text-zinc-900">
      Notification Preferences
    </h3>
    <p className="text-xs text-zinc-500 mt-1">
      Choose how your AZA AI CFO keeps you updated.
    </p>
  </div>

  {notificationPreferencesLoading ? (
    <div className="py-4 text-center text-xs text-zinc-500">
      Loading notification preferences...
    </div>
  ) : (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-zinc-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">
            Email
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Receive your daily AI CFO brief by email.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            updateNotificationPreference(
              "emailNotifications",
              !notificationPreferences.emailNotifications
            )
          }
          disabled={notificationPreferencesSaving}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            notificationPreferences.emailNotifications
              ? "bg-orange-500"
              : "bg-zinc-300"
          } ${
            notificationPreferencesSaving
              ? "opacity-60 cursor-not-allowed"
              : ""
          }`}
          aria-label="Toggle email notifications"
          aria-pressed={
            notificationPreferences.emailNotifications
          }
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              notificationPreferences.emailNotifications
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-zinc-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">
            SMS
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Receive your daily AI CFO brief by SMS.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            updateNotificationPreference(
              "smsNotifications",
              !notificationPreferences.smsNotifications
            )
          }
          disabled={notificationPreferencesSaving}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            notificationPreferences.smsNotifications
              ? "bg-orange-500"
              : "bg-zinc-300"
          } ${
            notificationPreferencesSaving
              ? "opacity-60 cursor-not-allowed"
              : ""
          }`}
          aria-label="Toggle SMS notifications"
          aria-pressed={
            notificationPreferences.smsNotifications
          }
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              notificationPreferences.smsNotifications
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-zinc-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">
            WhatsApp
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Receive your daily AI CFO brief on WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            updateNotificationPreference(
              "whatsappNotifications",
              !notificationPreferences.whatsappNotifications
            )
          }
          disabled={notificationPreferencesSaving}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            notificationPreferences.whatsappNotifications
              ? "bg-orange-500"
              : "bg-zinc-300"
          } ${
            notificationPreferencesSaving
              ? "opacity-60 cursor-not-allowed"
              : ""
          }`}
          aria-label="Toggle WhatsApp notifications"
          aria-pressed={
            notificationPreferences.whatsappNotifications
          }
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              notificationPreferences.whatsappNotifications
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  )}

  {notificationPreferencesMessage && (
    <p className="text-xs text-zinc-500 px-1">
      {notificationPreferencesMessage}
    </p>
  )}
</div>
                  </div>
                </div>
              </div>
            </div>
          )}


        

        {/* AI CFO TAB */}
        {flowState === "dashboard" && activeTab === "ai_cfo" && (
          <div className="space-y-4 pb-28 min-h-full">

            {/* AI CFO HEADER */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Sparkles size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-xl text-zinc-900">
                    AI CFO
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Your personal financial intelligence
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-zinc-600">
                  Online
                </span>
              </div>
            </div>

            {/* CFO STATUS */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-5 text-white shadow-lg shadow-orange-500/20">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-orange-100" />

                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-100">
                  CFO STATUS
                </p>
              </div>

              <h3 className="text-lg font-bold mt-2">
                {accountSecurityStatus === "Protected"
                  ? "Your finances are being monitored"
                  : "Your attention is required"}
              </h3>

              <p className="text-sm leading-relaxed mt-3 text-orange-50">
                {aiCfoInsight}
              </p>
            </div>

            {/* DAILY FINANCIAL BRIEF */}
            <div className="space-y-4">

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Today's Financial Brief
                  </p>

                  <h3 className="text-xl font-black text-zinc-900 mt-1">
                    Your money at a glance
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={loadDailyBrief}
                  disabled={dailyBriefLoading}
                  className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {dailyBriefLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {aiCfoSnapshot ? (
                <>
                  {/* BALANCE CARD */}
                  <div className="bg-zinc-900 rounded-[28px] p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">

                      <div>
                        <p className="text-xs text-zinc-400">
                          Available balance
                        </p>

                        <p className="text-3xl font-black tracking-tight mt-2">
                          ₦{aiCfoSnapshot.balance.toLocaleString("en-NG")}
                        </p>
                      </div>

                      <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                        <WalletCards size={20} />
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">

                      <div className="rounded-2xl bg-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                          Money in
                        </p>

                        <p className="text-sm font-bold mt-1">
                          ₦{aiCfoSnapshot.totalMoneyIn.toLocaleString("en-NG")}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                          Money out
                        </p>

                        <p className="text-sm font-bold mt-1">
                          ₦{aiCfoSnapshot.totalMoneyOut.toLocaleString("en-NG")}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* SPENDING + NET FLOW */}
                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className="bg-white/80 rounded-[24px] p-4 text-left shadow-sm border border-zinc-200 transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">

                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                          <ArrowUpRight size={17} />
                        </div>

                        <ChevronRight
                          size={16}
                          className="text-zinc-400"
                        />

                      </div>

                      <p className="text-xs text-zinc-500 mt-4">
                        Recent spending
                      </p>

                      <p className="text-lg font-black text-zinc-900 mt-1">
                        ₦{aiCfoSnapshot.totalSpending.toLocaleString("en-NG")}
                      </p>

                      <p className="text-[10px] text-zinc-400 mt-1">
                        {aiCfoSnapshot.completedTransactionCount} completed transactions
                      </p>
                    </button>

                    <div className="bg-white/80 rounded-[24px] p-4 shadow-sm border border-zinc-200">

                      <div className="flex items-center justify-between">

                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                          <TrendingUp size={17} />
                        </div>

                      </div>

                      <p className="text-xs text-zinc-500 mt-4">
                        Net transaction flow
                      </p>

                      <p className="text-lg font-black text-zinc-900 mt-1">
                        {aiCfoSnapshot.netTransactionFlow >= 0
                          ? "+"
                          : "-"}
                        ₦{Math.abs(
                          aiCfoSnapshot.netTransactionFlow
                        ).toLocaleString("en-NG")}
                      </p>

                      <p className="text-[10px] text-zinc-400 mt-1">
                        Money in minus money out
                      </p>

                    </div>

                  </div>

                  {/* SAVINGS POSITION */}
                  <div className="bg-white/80 rounded-[26px] p-5 shadow-sm border border-zinc-200">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                          Savings position
                        </p>

                        <p className="text-xl font-black text-zinc-900 mt-1">
                          ₦{aiCfoSnapshot.totalSavings.toLocaleString("en-NG")}
                        </p>
                      </div>

                      <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <PiggyBank size={20} />
                      </div>

                    </div>

                    <div className="space-y-3 mt-4">

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("home");
                          setFlowState("dashboard");
                        }}
                        className="w-full flex items-center justify-between rounded-2xl bg-orange-50 p-3 text-left transition hover:bg-orange-100"
                      >

                        <div>
                          <p className="text-sm font-bold text-zinc-800">
                            Rainy Day Savings
                          </p>

                          <p className="text-[10px] text-zinc-500">
                            Accessible emergency savings
                          </p>
                        </div>

                        <p className="text-sm font-black text-zinc-900">
                          ₦{aiCfoSnapshot.rainyDaySavings.toLocaleString("en-NG")}
                        </p>

                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAiCfoMessage(
                            "How should I buid my Rainy Day savings?"
                          );
                        }}
                        className="w-full flex items-center justify-between rounded-2xl bg-zinc-100 p-3 text-left transition hover:bg-zinc-200"
                      >

                        <div>
                          <p className="text-sm font-bold text-zinc-800">
                            Locked Savings
                          </p>

                          <p className="text-[10px] text-zinc-500">
                            Automatically locked for 300 days
                          </p>
                        </div>

                        <p className="text-sm font-black text-zinc-900">
                          ₦{aiCfoSnapshot.lockedSavings.toLocaleString("en-NG")}
                        </p>

                      </button>

                    </div>

                  </div>

                  {/* CFO FOCUS */}
                  <div className="bg-orange-50 rounded-[26px] p-5 border border-orange-200">

                    <div className="flex items-start gap-3">

                      <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                        <Sparkles size={18} />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">
                          CFO Focus
                        </p>

                        <p className="text-sm font-semibold leading-6 text-zinc-800 mt-1">
                          {aiCfoInsight}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* CFO ACTIONS */}
                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className="rounded-2xl bg-zinc-900 px-4 py-3 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      Review activity
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAiCfoInput("What should I improve?");
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-900 transition hover:bg-zinc-50"
                    >
                      Ask my CFO
                    </button>

                  </div>
                </>
              ) : (
                <div className="bg-white/70 rounded-[26px] border border-zinc-200 p-5">
                  <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-2xl bg-zinc-200 animate-pulse" />

                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded bg-zinc-200 animate-pulse" />
                      <div className="h-4 w-48 rounded bg-zinc-200 animate-pulse" />
                    </div>

                  </div>
                </div>
              )}

            </div>
             
            {/* DAILY FINANCIAL BRIEF */}
            {dailyBrief && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Daily Financial Brief
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    A quick view of what happened with your money yesterday.
                  </p>
                </div>

                <div className="rounded-[28px] bg-zinc-900 text-white p-5 shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center">
                          <Sparkles size={16} />
                        </div>

                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">
                          CFO Brief
                        </p>
                      </div>

                      <p className="text-lg font-bold mt-4">
                        Here's what happened yesterday.
                      </p>

                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Your CFO is using your actual AZA transaction activity to keep you informed.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadDailyBrief}
                      disabled={dailyBriefLoading}
                      className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                    >
                      {dailyBriefLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-semibold">
                        Spent
                      </p>

                      <p className="text-base font-bold mt-1">
                        ₦{dailyBrief.yesterday.spending.toLocaleString()}
                      </p>

                      <p className="text-[10px] text-zinc-500 mt-1">
                        {dailyBrief.yesterday.spendingCount} spending transactions
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-semibold">
                        Money in
                      </p>

                      <p className="text-base font-bold mt-1">
                        ₦{dailyBrief.yesterday.moneyIn.toLocaleString()}
                      </p>

                      <p className="text-[10px] text-zinc-500 mt-1">
                        {dailyBrief.yesterday.moneyInCount} incoming transactions
                      </p>
                    </div>
                  </div>

                  {dailyBrief.yesterday.topSpendingCategory && (
                    <div className="mt-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] uppercase tracking-wide text-orange-300 font-semibold">
                            Biggest spending category
                          </p>

                          <p className="text-sm font-semibold mt-1">
                            {dailyBrief.yesterday.topSpendingCategory.category}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold">
                            ₦
                            {dailyBrief.yesterday.topSpendingCategory.amount.toLocaleString()}
                          </p>

                          <p className="text-[10px] text-zinc-400">
                            {dailyBrief.yesterday.topSpendingCategory.percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {dailyBrief.yesterday.largestSpending && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wide text-zinc-500 font-semibold">
                          Largest transaction
                        </p>

                        <p className="text-xs text-zinc-300 mt-1 truncate">
                          {dailyBrief.yesterday.largestSpending.description ||
                            dailyBrief.yesterday.largestSpending.recipient ||
                            "AZA transaction"}
                        </p>
                      </div>

                      <p className="text-sm font-bold shrink-0">
                        ₦
                        {dailyBrief.yesterday.largestSpending.amount.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* TODAY'S FOCUS */}
                  <div className="mt-4 rounded-2xl bg-white p-4 text-zinc-900">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-400 font-semibold">
                          Today's Focus
                        </p>

                        <p className="text-sm font-bold mt-1">
                          {dailyBrief.focus.title}
                        </p>

                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                          {dailyBrief.focus.message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const focusType = dailyBrief.focus.type;

                        if (focusType === "SPENDING") {
                          setActiveTab("activity");
                          return;
                        }

                        if (focusType === "RAINY_DAY") {
                          handleAiCfoMessage(
                            "How should I build my Rainy Day Savings?"
                          );
                          return;
                        }

                        if (focusType === "BALANCE") {
                          handleAiCfoMessage(
                            "What should I do to protect my available balance?"
                          );
                          return;
                        }

                        handleAiCfoMessage(
                          "How can I maintain my current financial position?"
                        );
                      }}
                      className="w-full mt-4 rounded-2xl bg-zinc-900 text-white px-4 py-3 flex items-center justify-between active:scale-[0.99] transition-all"
                    >
                      <span className="text-xs font-semibold">
                        {dailyBrief.focus.type === "SPENDING"
                          ? "Review spending"
                          : dailyBrief.focus.type === "RAINY_DAY"
                          ? "Build Rainy Day Savings"
                          : dailyBrief.focus.type === "BALANCE"
                          ? "Protect my balance"
                          : "Ask my CFO"}
                      </span>

                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CFO PRIORITY */}
            {aiCfoAssessment && (
              <div className="rounded-3xl bg-zinc-900 text-white p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0">
                    <Sparkles size={18} />
                  </div>

                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">
                      CFO Priority
                    </p>

                    <p className="text-base font-semibold mt-1">
                      {aiCfoAssessment.priority === "BALANCE"
                        ? "Protect your available balance"
                        : aiCfoAssessment.priority === "SPENDING"
                        ? "Review your recent spending"
                        : aiCfoAssessment.priority === "RAINY_DAY"
                        ? "Build your Rainy Day Savings"
                        : "Maintain your current financial position"}
                    </p>

                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {aiCfoAssessment.priority === "BALANCE"
                        ? "Your available balance needs attention. Review your recent activity before making additional spending commitments."
                        : aiCfoAssessment.priority === "SPENDING"
                        ? `Your recent spending is ₦${aiCfoAssessment.summary.totalSpending.toLocaleString()} and deserves a closer look.`
                        : aiCfoAssessment.priority === "RAINY_DAY"
                        ? "You have Locked Savings, but no accessible Rainy Day Savings yet. Building both gives your finances two different layers of protection."
                        : "Your current financial position does not show an immediate priority. Keep monitoring your spending and savings."}
                    </p>
                  </div>
                </div>
              </div>
            )}


            {/* CFO ACTION CENTER */}
            {aiCfoAssessment && (

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Today's CFO Plan
                  </p>
              <p className="text-xs text-zinc-500 mt-1">
                Actions based on your current AZA financial position.
              </p>
            </div>
            <div className="space-y-3">
              {aiCfoActions.map((action, index) => {
                const actionIcon =
                  action.type === "security"
                    ? ShieldCheck
                    : action.type === "rainy_day"
                    ? PiggyBank
                    : action.type === "locked"
                    ? LockKeyhole
                    : ArrowUpRight;
                const ActionIcon = actionIcon;
                return (
                  <button
                    key={`${action.type}-${index}`}
                    type="button"
                    onClick={() => {
                      if (action.type === "spending") {
                        setActiveTab("activity");
                        return;
                      }
                      if (action.type === "security") {
                        setActiveTab("profile");
                        return;
                      }
                      if (action.type === "rainy_day") {
                        handleAiCfoMessage(
                          "How should I build my Rainy Day Savings?"
                        );
                        return;
                      }
                      if (action.type === "locked") {
                        handleAiCfoMessage(
                          "How much do I have in my Locked Savings and when does it mature?"
                        );
                        
                      }
                    }}
                    className="w-full text-left bg-white/80 border border-white/80 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                        <ActionIcon
                          size={19}
                          className="text-orange-600"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">
                          {action.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight
                        size={17}
                        className="text-zinc-400 shrink-0"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const input =
                  document.querySelector<HTMLTextAreaElement>(
                    'textarea[placeholder*="Ask your CFO"]'
                  );
                input?.focus();
              }}
              className="w-full rounded-3xl bg-zinc-900 text-white px-4 py-4 flex items-center justify-between shadow-lg hover:bg-zinc-800 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">
                    Ask your CFO anything
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Get advice based on your AZA financial activity.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                className="text-zinc-400"
              />
            </button>
              </div>
            )}

            {/* FINANCIAL HEALTH */}
{aiCfoAssessment && (
  <div className="space-y-3">
    <div>
      <p className="text-sm font-semibold text-zinc-900">
        Financial Health
      </p>

      <p className="text-xs text-zinc-500 mt-1">
        Your CFO's current view of your financial position.
      </p>
    </div>

    <div className="rounded-3xl bg-white/80 border border-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">
            Overall status
          </p>

          <p className="text-lg font-bold text-zinc-900 mt-1">
            {aiCfoAssessment.overallStatus ===
            "ATTENTION"
              ? "Needs attention"
              : aiCfoAssessment.overallStatus ===
                "WATCH"
              ? "Worth watching"
              : "Stable"}
          </p>
        </div>

        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            aiCfoAssessment.overallStatus ===
            "ATTENTION"
              ? "bg-red-100 text-red-600"
              : aiCfoAssessment.overallStatus ===
                "WATCH"
              ? "bg-amber-100 text-amber-600"
              : "bg-orange-100 text-orange-600"
          }`}
        >
          <TrendingUp size={19} />
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed mt-3">
        {aiCfoAssessment.overallMessage}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-semibold">
            Balance
          </p>

          <p className="text-xs font-bold text-zinc-800 mt-1">
            {aiCfoAssessment.balanceLabel ===
            "HEALTHY"
              ? "Healthy"
              : aiCfoAssessment.balanceLabel ===
                "WATCH"
              ? "Watch"
              : "Low"}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-semibold">
            Spending
          </p>

          <p className="text-xs font-bold text-zinc-800 mt-1">
            {aiCfoAssessment.spendingLabel ===
            "NO_DATA"
              ? "No data"
              : aiCfoAssessment.spendingLabel ===
                "HIGH"
              ? "High"
              : aiCfoAssessment.spendingLabel ===
                "MODERATE"
              ? "Moderate"
              : "Low"}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-semibold">
            Savings
          </p>

          <p className="text-xs font-bold text-zinc-800 mt-1">
            {aiCfoAssessment.savingsLabel ===
            "ESTABLISHED"
              ? "Established"
              : aiCfoAssessment.savingsLabel ===
                "BUILDING"
              ? "Building"
              : "Start"}
          </p>
        </div>
      </div>
    </div>
  </div>
)}

            {/* CHAT */}
            <div className="bg-white/70 rounded-3xl border border-white/70 shadow-sm overflow-hidden">

              <div className="px-4 py-3 border-b border-zinc-200/70">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-orange-500" />

                  <h3 className="font-bold text-sm text-zinc-900">
                    Talk to your CFO
                  </h3>
                </div>

                <p className="text-[11px] text-zinc-500 mt-1">
                  Ask questions about your AZA finances.
                </p>
              </div>

              {/* MESSAGES */}

              <div className="px-4 py-4 space-y-3">

                {aiCfoMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-[90%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-7 h-7 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 shadow-sm">
                          <Sparkles
                            size={13}
                            className="text-orange-400"
                          />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          message.role === "user"
                            ? "bg-orange-500 text-white rounded-br-md"
                            : "bg-white text-zinc-800 border border-zinc-100 rounded-bl-md"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {aiCfoLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">

                      <div className="w-7 h-7 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
                        <Sparkles
                          size={13}
                          className="text-orange-400"
                        />
                      </div>

                      <div className="bg-white border border-zinc-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />

                          <span
                            className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                            style={{ animationDelay: "120ms" }}
                          />

                          <span
                            className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                            style={{ animationDelay: "240ms" }}
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

                
              {/* QUICK QUESTIONS */}
              <div className="px-4 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Quick questions
                </p>

                <div className="flex gap-2 overflow-x-auto pb-1">

                  <button
                    onClick={() =>
                      handleAiCfoMessage("How am I doing financially?")
                    }
                    className="shrink-0 px-3 py-2 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold"
                  >
                    How am I doing?
                  </button>

                  <button
                    onClick={() =>
                      handleAiCfoMessage("How much do I have saved?")
                    }
                    className="shrink-0 px-3 py-2 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold"
                  >
                    My savings
                  </button>

                  <button
                    onClick={() =>
                      handleAiCfoMessage("What should I improve today?")
                    }
                    className="shrink-0 px-3 py-2 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold"
                  >
                    What should I improve?
                  </button>

                </div>
              </div>

              {/* MESSAGE INPUT */}
              <div className="p-3 border-t border-zinc-200/70 bg-white/60">
                <div className="flex items-end gap-2">

                  <textarea
                    value={aiCfoInput}
                    onChange={(event) => setAiCfoInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        if (!aiCfoLoading) {
                          handleAiCfoMessage();
                        }
                      }
                    }}
                    placeholder="Ask your AI CFO..."
                    rows={1}
                    disabled={aiCfoLoading}
                    className="flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  <button
                    onClick={() => handleAiCfoMessage()}
                    disabled={!aiCfoInput.trim() || aiCfoLoading}
                    className="w-11 h-11 shrink-0 rounded-2xl bg-orange-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Send size={18} />
                  </button>

                </div>
              </div>

            </div>

          </div>
        )}

        </div>

        {/* Navigation Dock */}
        {flowState === "dashboard" && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/40 py-3 px-6 flex justify-between items-center z-20">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "home" ? "text-orange-500 font-bold" : "text-zinc-400"}`}
            >
              <HomeIcon size={20} />
              <span className="text-[10px]">Home</span>
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "activity" ? "text-orange-500 font-bold" : "text-zinc-400"}`}
            >
              <Clock size={20} />
              <span className="text-[10px]">Activity</span>
            </button>
            <button
              onClick={() => setActiveTab("cards")}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "cards" ? "text-orange-500 font-bold" : "text-zinc-400"}`}
            >
              <CreditCard size={20} />
              <span className="text-[10px]">Cards</span>
            </button>

            <button
              onClick={() => setActiveTab("ai_cfo")}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === "ai_cfo" ? "text-orange-500 font-bold" : "text-zinc-400"
              }`}
            >
              <Sparkles size={20} />
              <span className="text-[10px]">AI CFO</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "profile" ? "text-orange-500 font-bold" : "text-zinc-400"}`}
            >
              <User size={20} />
              <span className="text-[10px]">Profile</span>
            </button>
          </div>
        )}
      
      </div>
      
    </main>
  );

}

export default function Page() {
  return (
    <AuthGate>
      {(user) => <AzaApp user={user} />}
    </AuthGate>  
  );
}
