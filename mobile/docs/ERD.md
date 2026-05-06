 ERD
# Implement features

**PROBLEM STATEMENT:**  
Sari-sari store owners often struggle with manual, handwritten calculations of their daily and monthly revenue. This process is prone to human error, even with multiple manual checks, leading to inaccurate financial records and potential debt. Furthermore, poor inventory tracking results in stockouts of essential goods, such as canned products, driving customers to find cheaper or more reliable alternatives in nearby locations.

Introduction: **ManindahAI**

Scope: The project addresses the financial literacy of Filipino sari-sari store owners by developing a mobile app. This app will allow owners to input their products (via a paper list or manual typing) and then calculate their profit by checking the original price and adding an additional price for the owner's profit. As for the customer side, there is a feature where the customer looks for a product, then the app searches for nearby sari-sari stores, then shows a list of options(if there are many), location, and pictures(if the sari-sari owner provides)

Features & Side-Features: 

1. **Customer Side**  
   1. **Locate Store:** Allows customers to search for a product, which prompts the app to find nearby sari-sari stores and display a list of options, location, and pictures (if available).  
   2. **Community Remarks:** A feature for customers to provide feedback, ratings, or reviews about the sari-sari stores and their service.

2. **Sari-Sari store owner's side**  
   1. **Product List Picture Taking(scan texts, not images literally):** The owner sends a picture of their list, and the app creates a product list for them.  
   2. **Table Creation:** The tables show information like the product name, original price, sari-sari owner price, quantity, etc.  
   3. **AI Suggestions**: At the end of the day, week, or month, the AI scans records of popular products and suggests actions to increase sales.  
   4. **Inventory Management & Low Stock Alerts**: Tracks stock levels automatically and alerts owners when popular items are running low to prevent stockouts.  
   5. **Expense & Income Tracker (Beyond Product Sales):** A dedicated module for tracking overall business finances, allowing the owner to easily log non-product expenses (e.g., electricity, rent, permit fees) alongside their sales income. This would provide a complete Profit & Loss summary, significantly boosting their financial literacy.  
   6. **Daily/Monthly Sales OCR & History:** Enables owners to take a photo of their handwritten paper records to calculate daily or monthly totals automatically. It includes a verification step where the app reads back the results and maintains a searchable history for the owner to review and ensure clarity.  
   7. **Supplier Price Comparison Tool:** Allow the owner to record prices from different suppliers for the same product. The app could then suggest the most cost-effective supplier when it’s time to restock, helping the owner maximize the "original price" component of the profit calculation.  
   8. **Sales and Profit Analytics Dashboard:** Provides the owner with visual charts and key metrics (e.g., top-selling products, daily profit trends, most profitable categories) based on the recorded sales data, enabling data-driven business decisions.  
#  PlantUML code:

@startuml  
' Style  
hide circle  
skinparam linetype ortho

entity "User" as User {  
  \+user\_id : int \<\<PK\>\>  
  name : varchar  
  email : varchar  
  firebase_uid : varchar  
  role : enum  
  status : enum  
}

entity "Store" as Store {  
  \+store\_id : int \<\<PK\>\>  
  user\_id : int \<\<FK\>\>  
  store\_name : varchar  
  address : text  
  latitude : double  
  longitude : double  
  image\_url : text  
  status : enum  
}

entity "Product" as Product {  
  \+product\_id : int \<\<PK\>\>  
  store\_id : int \<\<FK\>\>  
  name : varchar  
  original\_price : decimal  
  selling\_price : decimal  
  quantity : int  
  category : varchar  
}

entity "Sales" as Sales {  
  \+sale\_id : int \<\<PK\>\>  
  store\_id : int \<\<FK\>\>  
  date : datetime  
  total\_amount : decimal  
  total\_profit : decimal  
}

entity "SaleItem" as SaleItem {  
  \+sale\_item\_id : int \<\<PK\>\>  
  sale\_id : int \<\<FK\>\>  
  product\_id : int \<\<FK\>\>  
  quantity : int  
  price\_at\_sale : decimal  
}

entity "Supplier" as Supplier {  
  \+supplier\_id : int \<\<PK\>\>  
  name : varchar  
  contact\_info : text  
}

entity "SupplierPrice" as SupplierPrice {  
  \+supplier\_price\_id : int \<\<PK\>\>  
  product\_id : int \<\<FK\>\>  
  supplier\_id : int \<\<FK\>\>  
  price : decimal  
  date\_recorded : datetime  
}

entity "Review" as Review {  
  \+review\_id : int \<\<PK\>\>  
  user\_id : int \<\<FK\>\>  
  store\_id : int \<\<FK\>\>  
  rating : int  
  comment : text  
  created\_at : datetime  
}

entity "Report" as Report {  
  \+report\_id : int \<\<PK\>\>  
  reported\_by : int \<\<FK\>\>  
  review\_id : int \<\<FK\>\>  
  store\_id : int \<\<FK\>\>  
  reason : text  
  status : enum  
}

entity "ModerationAction" as ModerationAction {  
  \+action\_id : int \<\<PK\>\>  
  moderator\_id : int \<\<FK\>\>  
  user\_id : int \<\<FK\>\>  
  store\_id : int \<\<FK\>\>  
  action\_type : enum  
  description : text  
  created\_at : datetime  
}

entity "Expense" as Expense {  
  \+expense\_id : int \<\<PK\>\>  
  store\_id : int \<\<FK\>\>  
  name : varchar  
  amount : decimal  
  date : datetime  
}

entity "InventoryLog" as InventoryLog {  
  \+log\_id : int \<\<PK\>\>  
  product\_id : int \<\<FK\>\>  
  change\_type : enum  
  quantity\_changed : int  
  date : datetime  
}

' Relationships  
User ||--|| Store : owns  
Store ||--o{ Product : has  
Store ||--o{ Sales : records  
Sales ||--o{ SaleItem : contains  
Product ||--o{ SaleItem : included\_in

Product ||--o{ SupplierPrice : priced\_by  
Supplier ||--o{ SupplierPrice : provides

User ||--o{ Review : writes  
Store ||--o{ Review : receives

User ||--o{ Report : submits  
Review ||--o{ Report : reported\_in  
Store ||--o{ Report : reported\_in

User ||--o{ ModerationAction : performs  
Store ||--o{ ModerationAction : targeted  
User ||--o{ ModerationAction : affected

Store ||--o{ Expense : has  
Product ||--o{ InventoryLog : tracked\_in

@enduml

# User Side ERD:


# Store Owner ERD

# Moderator ERD 
