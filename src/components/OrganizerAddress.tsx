import Ph from "./Ph";
import { LEGAL } from "@/lib/legal";

export default function OrganizerAddress({ withContact = true }: { withContact?: boolean }) {
  return (
    <address>
      {LEGAL.organizerName}
      <br />
      {LEGAL.legalForm}
      <br />
      vertreten durch: <Ph>{LEGAL.representatives}</Ph>
      <br />
      <Ph>{LEGAL.street}</Ph>
      <br />
      <Ph>{LEGAL.city}</Ph>
      {withContact && (
        <>
          <br />
          <br />
          E-Mail: <Ph>{LEGAL.email}</Ph>
          {LEGAL.phone && (
            <>
              <br />
              Telefon: <Ph>{LEGAL.phone}</Ph>
            </>
          )}
        </>
      )}
    </address>
  );
}
