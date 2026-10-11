// Sample client: the fictional Aurelia Foods Group. All values are invented and
// run through the mock providers; badges read "(demo)".

import type { ClientProfile, StakeholderSeed } from "./types"
import { DEFAULT_PASTE, DEMO_ANSWERS, GROUP, PROFILE_ORDER, SCRIPT_SKIP, SITE_META } from "../demoData"
import type { StakeholderRole } from "../types"

// Fictional people. Each plant has the four roles a question can be routed to.
const PEOPLE: Record<string, [string, string, string, string]> = {
  Noida: ["Vikram Sethi", "Meera Nair", "Arjun Malhotra", "Pooja Iyer"],
  "Greater Noida": ["Sandeep Rawat", "Kavya Menon", "Rohit Bansal", "Nisha Kapoor"],
  Muzaffarnagar: ["Harish Tyagi", "Shalini Verma", "Amit Chauhan", "Deepak Saini"],
  Jaipur: ["Mahesh Sharma", "Ritu Agarwal", "Naveen Joshi", "Sunita Meena"],
  Pune: ["Aditya Kulkarni", "Sneha Deshpande", "Manoj Patil", "Varun Joshi"],
  Indore: ["Rakesh Jain", "Priya Dubey", "Anil Mishra", "Swati Tiwari"],
  Hyderabad: ["Srinivas Reddy", "Lakshmi Rao", "Kiran Kumar", "Anjali Varma"],
  Chennai: ["Karthik Raman", "Divya Subramanian", "Suresh Babu", "Priyanka Natarajan"],
  Bengaluru: ["Prakash Gowda", "Shruti Hegde", "Naveen Shetty", "Rekha Murthy"],
  Hosur: ["Murali Krishnan", "Revathi Sundaram", "Ganesh Pandian", "Vijay Anand"],
  Kolkata: ["Subhash Ghosh", "Ananya Sen", "Debashish Roy", "Moumita Das"],
  "New Delhi": ["Neha Khanna", "Rahul Gupta", "Tanvi Arora", "Kunal Bhatia"],
  Gurugram: ["Ishaan Mehta", "Ritika Saxena", "Gaurav Yadav", "Simran Kaur"],
}

const FACTORY_ROLES: StakeholderRole[] = ["Plant head", "EHS manager", "HR manager", "Energy manager"]
const OFFICE_ROLES: StakeholderRole[] = ["Office admin", "HR manager", "Finance controller", "IT / ERP owner"]

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

const stakeholders: StakeholderSeed[] = Object.entries(PEOPLE).flatMap(([city, names]) => {
  const meta = SITE_META[city]
  if (!meta) return []
  const roles = meta.type === "office" ? OFFICE_ROLES : FACTORY_ROLES
  return names.map((name, i) => ({
    id: `sh-${meta.id}-${i}`,
    name,
    role: roles[i],
    siteId: meta.id,
    email: `${slug(name).replace(/-/g, ".")}@aurelia.example`,
  }))
})

export const AURELIA: ClientProfile = {
  id: "aurelia",
  kind: "sample",
  name: "Aurelia Foods Group",
  shortName: "Aurelia",
  legalName: "Aurelia Foods Limited",
  sector: "foods",
  tagline: "Fictional sample group · 13 locations",
  label: "Sample data: Aurelia Foods Group (fictional)",
  group: GROUP,
  cin: "L15490UP2004PLC028811",
  reportingNote: "Fictional listed food group used to show the full journey with seeded mock sources.",
  publicSites: [],
  publicEntities: [],
  publicGst: [],
  documentsUsed: [],
  notPublic: [],
  stakeholders: [
    ...stakeholders,
    { id: "sh-group-esg", name: "Ananya Rao", role: "ESG lead", email: "ananya.rao@aurelia.example" },
    { id: "sh-group-cs", name: "Farhan Qureshi", role: "Company secretary", email: "farhan.qureshi@aurelia.example" },
    { id: "sh-group-fc", name: "Lakshmi Iyengar", role: "Finance controller", email: "lakshmi.iyengar@aurelia.example" },
    { id: "sh-group-proc", name: "Rohan Desai", role: "Procurement head", email: "rohan.desai@aurelia.example" },
  ],
  defaultPaste: DEFAULT_PASTE,
  profileOrder: PROFILE_ORDER,
  demoAnswers: DEMO_ANSWERS,
  scriptSkip: SCRIPT_SKIP,
}
