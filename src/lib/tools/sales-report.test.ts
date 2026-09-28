import { guessMapping, parseCsv, parseDate, parseMoney, summarise, taxYear } from "./sales-report";

describe("sales report", () => {
  it("reads money in the shapes exports use", () => {
    expect(parseMoney("£1,234.56")).toBe(1234.56);
    expect(parseMoney("-£3.00")).toBe(-3);
    expect(parseMoney("(3.00)")).toBe(-3);
    expect(parseMoney("12.50 GBP")).toBe(12.5);
    expect(parseMoney("--")).toBe(0);
  });

  it("reads UK and ISO dates", () => {
    expect(parseDate("05/04/2026")?.toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(parseDate("2026-04-06T10:00:00Z")?.toISOString().slice(0, 10)).toBe("2026-04-06");
    expect(parseDate("12 Feb 2026")?.toISOString().slice(0, 10)).toBe("2026-02-12");
    expect(parseDate("Feb 12, 2026")?.toISOString().slice(0, 10)).toBe("2026-02-12");
  });

  it("splits tax years on 6 April", () => {
    expect(taxYear(new Date(Date.UTC(2026, 3, 5)))).toBe("2025 to 26");
    expect(taxYear(new Date(Date.UTC(2026, 3, 6)))).toBe("2026 to 27");
  });

  it("guesses columns and totals an export, skipping other row types", () => {
    const csv = [
      "Some report title,,",
      "",
      "Transaction creation date,Type,Item title,Gross transaction amount,Final value fee,Postage and packaging,Net amount",
      "10/04/2026,Order,Wax jacket,45.00,-5.40,3.50,43.10",
      "02/04/2026,Order,Mug,10.00,-1.30,,8.70",
      "03/04/2026,Payout,,,,,-51.80",
    ].join("\n");
    const { headers, rows } = parseCsv(csv);
    const m = guessMapping(headers);
    expect(m.date).toBe("Transaction creation date");
    expect(m.gross).toBe("Gross transaction amount");
    expect(m.fees).toEqual(["Final value fee"]);
    expect(m.type).toBe("Type");
    const s = summarise(rows, m, new Set(["Order"]));
    expect(s.rows).toBe(2);
    expect(s.gross).toBeCloseTo(55);
    expect(s.fees).toBeCloseTo(6.7);
    expect(s.byTaxYear.map((t) => t.key)).toEqual(["2025 to 26", "2026 to 27"]);
  });
});
