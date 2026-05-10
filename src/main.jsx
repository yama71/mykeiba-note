import React from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Clock,
  ListChecks,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  Trophy,
} from "lucide-react";
import { createKeibaApp } from "./app-core.js";
import "./styles.css";

const App = createKeibaApp(React, {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Clock,
  ListChecks,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  Trophy,
});

createRoot(document.getElementById("root")).render(<App />);
