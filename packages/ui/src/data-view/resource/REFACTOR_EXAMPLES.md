/**
 * CRUD List Page Refactor Examples
 * 
 * The ResourcePage now supports a complete CRUD list layout with:
 * - Title and description
 * - Search bar
 * - Filters button
 * - Toolbar for actions (create, print, export, etc.)
 * - Proper spacing and padding
 * - Full RTL support
 */

// ─────────────────────────────────────────────────────────
// Example 1: Basic CRUD List Page (before and after)
// ─────────────────────────────────────────────────────────

// BEFORE:
// function UnitsPage() {
//   return (
//     <UnitsResource>
//       <UnitsResource.Page title="Units">
//         <UnitsResource.Table columns={createUnitsColumns} />
//       </UnitsResource.Page>
//     </UnitsResource>
//   )
// }

// AFTER:
function UnitsPageRefactored() {
  return (
    <UnitsResource>
      <UnitsResource.Page
        title="Units"
        description="Manage measurement units for your inventory"
        showSearch={true}
        showFilters={true}
        toolbar={<UnitsResource.CreateButton />}
        onSearchChange={(value) => {
          // Handle search - update URL params
          console.log("Search:", value)
        }}
        onFiltersClick={() => {
          // Open filters dialog or sidebar
          console.log("Show filters")
        }}
      >
        <UnitsResource.Table columns={createUnitsColumns} />
      </UnitsResource.Page>
    </UnitsResource>
  )
}

// ─────────────────────────────────────────────────────────
// Example 2: Advanced CRUD List with Multiple Actions
// ─────────────────────────────────────────────────────────

function AdvancedCrudPage() {
  return (
    <ItemsResource>
      <ItemsResource.Page
        title="Inventory Items"
        description="Manage all items in your inventory system"
        searchPlaceholder="Search items by name or SKU..."
        showSearch={true}
        showFilters={true}
        padding="lg"
        toolbar={
          <>
            <ItemsResource.CreateButton />
            <Button variant="outline" size="sm">
              <PrintIcon className="size-4 me-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <DownloadIcon className="size-4 me-2" />
              Export
            </Button>
          </>
        }
        toolbarActions={
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon className="size-4" />
          </Button>
        }
        onSearchChange={(value) => {
          // Update table search filter
          tableState.setSearch(value)
        }}
        onFiltersClick={() => {
          // Show filters panel
          setShowFilters(true)
        }}
      >
        <ItemsResource.Table columns={createItemsColumns} />
        <ItemsResource.Pagination />
      </ItemsResource.Page>
    </ItemsResource>
  )
}

// ─────────────────────────────────────────────────────────
// Example 3: Custom Padding and Layout Control
// ─────────────────────────────────────────────────────────

function CustomLayoutPage() {
  return (
    <CategoriesResource>
      <CategoriesResource.Page
        title="Product Categories"
        padding="sm" // Compact layout
        showSearch={true}
        showFilters={false} // No filters needed
        toolbar={<CategoriesResource.CreateButton />}
      >
        <CategoriesResource.Grid columns={3} />
      </CategoriesResource.Page>
    </CategoriesResource>
  )
}

// ─────────────────────────────────────────────────────────
// Example 4: Fullscreen Layout (for detailed views)
// ─────────────────────────────────────────────────────────

function FullscreenListPage() {
  return (
    <DataResource>
      <DataResource.Page
        title="Data Analysis"
        fullscreen={true}
        showSearch={true}
        showFilters={true}
        padding="none" // No padding in fullscreen
        toolbar={
          <>
            <Button variant="outline" size="sm">
              Export Report
            </Button>
            <Button size="sm">Generate Analysis</Button>
          </>
        }
      >
        <DataResource.Table columns={createDataColumns} />
      </DataResource.Page>
    </DataResource>
  )
}

// ─────────────────────────────────────────────────────────
// Props Documentation
// ─────────────────────────────────────────────────────────

/*
ResourcePage Props:

{
  // Display Properties
  title?: string;                           // Page title
  description?: string;                     // Optional subtitle/description
  
  // Search & Filter Controls
  showSearch?: boolean;                     // Show search input (default: true)
  searchPlaceholder?: string;               // Search input placeholder
  onSearchChange?: (value: string) => void; // Search value handler
  
  showFilters?: boolean;                    // Show filters button (default: true)
  onFiltersClick?: () => void;              // Filters button click handler
  
  // Toolbar Customization
  toolbar?: ReactNode | ResourceFunction;  // Main toolbar content
  toolbarActions?: ReactNode | ResourceFunction; // Additional actions slot
  
  // Layout Control
  padding?: "none" | "sm" | "md" | "lg";    // Page padding (default: "md")
  fullscreen?: boolean;                     // Full screen mode
  
  // Content
  children: ReactNode;                      // Page content (tables, grids, etc.)
}

Features:

✓ RTL/LTR Automatic Direction Handling
✓ Responsive Toolbar Layout (stacks on mobile)
✓ Search Input with Icon
✓ Filters Button with Icon
✓ Flexible Action Slots
✓ Proper Spacing & Padding
✓ Overflow Handling for Content Area
✓ Function-based Props (access to resource context)
*/

export {}
