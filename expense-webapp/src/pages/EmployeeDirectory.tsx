import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { useEmployeeDirectory } from "../lib/useEmployeeDirectory";

export function EmployeeDirectoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { employees, loading, error, nameOf } = useEmployeeDirectory();

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Employees</PageTitle.Header>
      </PageTitle>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Name</ListingTable.Cell>
              <ListingTable.Cell>Email</ListingTable.Cell>
              <ListingTable.Cell>Manager</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {loading ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={3}>Loading…</ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {!loading && employees.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={3}>
                  <ListingTable.EmptyState title="No employees yet" />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : null}
            {employees.map((employee) => (
              <ListingTable.Row
                key={employee.id}
                clickable
                onClick={() => navigate(`/employees/${employee.id}/manager`)}
              >
                <ListingTable.Cell>{employee.name}</ListingTable.Cell>
                <ListingTable.Cell>{employee.email}</ListingTable.Cell>
                <ListingTable.Cell>{nameOf(employee.managerId)}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
