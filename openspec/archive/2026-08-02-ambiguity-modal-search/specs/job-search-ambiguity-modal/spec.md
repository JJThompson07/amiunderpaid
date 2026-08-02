## Purpose

Provides a dynamic, in-modal search feature allowing users to query the full job dictionary if their initial ambiguous search doesn't return the correct closest matches.

## ADDED Requirements

### Requirement: Search Input Field
The ambiguity modal MUST present an input field at the top allowing the user to search for other job roles if the default options are unsatisfactory.

#### Scenario: Displaying the search field
- **WHEN** the ambiguity modal is rendered
- **THEN** a search input field with a placeholder (e.g., "Search other roles...") MUST be visible at the top of the modal content

### Requirement: Live Dictionary Search
The system MUST query the Algolia dictionary using the input string and instantly update the list of selectable options within the modal.

#### Scenario: Entering a search term
- **WHEN** the user types into the search input field
- **THEN** the modal MUST trigger a debounced search against the respective country's job dictionary index
- **THEN** the modal MUST replace the initially rendered options with the search results from the dictionary

### Requirement: Search Debouncing
The system MUST implement a debounce mechanism to avoid spamming the search provider while the user is typing.

#### Scenario: Rapid typing
- **WHEN** the user types characters rapidly into the search input
- **THEN** the system MUST wait for a short delay (e.g., 300ms) after the user stops typing before dispatching the query

### Requirement: Default Options Fallback
The system MUST revert to the initial ambiguous matches if the search input is cleared or is deemed too short to yield meaningful dictionary results.

#### Scenario: Clearing the search
- **WHEN** the user clears the search input (or reduces it to fewer than 2 characters)
- **THEN** the modal MUST immediately display the original options passed from the parent component
