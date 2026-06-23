## ADDED Requirements

### Requirement: Recruiter leads query security
The system SHALL secure the `leads` Firestore collection, ensuring only authenticated recruiters can read documents where the `recruiterId` field matches their user ID.

#### Scenario: Recruiter reads their own lead document
- **WHEN** an authenticated recruiter requests a lead document with `recruiterId` equal to their `uid`
- **THEN** the system SHALL permit the read request.

#### Scenario: Recruiter attempts to read another recruiter's lead document
- **WHEN** an authenticated recruiter requests a lead document with `recruiterId` different from their `uid`
- **THEN** the system SHALL deny the read request.

### Requirement: Recruiter leads query composite index
The system SHALL define a composite index on the `leads` collection for fields `recruiterId` (ascending) and `createdAt` (descending) to support dashboard queries.

#### Scenario: Querying recruiter leads sorted by creation date
- **WHEN** the dashboard queries `leads` collection with `recruiterId == uid` ordered by `createdAt desc`
- **THEN** the system SHALL successfully return the matching documents sorted by date without index errors.

### Requirement: Mapped leads data UI alignment
The system SHALL map the raw Firestore lead properties to columns (`date`, `name`, `role`, `location`) for display in the table.

#### Scenario: Leads table data fields match column definition
- **WHEN** leads are retrieved from Firestore in `app/pages/recruiter/leads.vue`
- **THEN** the computed `leadsData` SHALL format `createdAt` as a localized date, and provide `candidateName` as `name`, `searchedRole` as `role`, and `location` as `location`.
