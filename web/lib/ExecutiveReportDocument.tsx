import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportPayload } from "./report-payload";
import { formatCurrency } from "./report-payload";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
    color: "#171717",
  },
  subtitle: {
    fontSize: 9,
    color: "#525252",
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#171717",
    borderBottomWidth: 1,
    borderBottomColor: "#a3a3a3",
    paddingBottom: 2,
  },
  body: {
    lineHeight: 1.4,
    color: "#404040",
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletPoint: {
    width: 12,
    marginRight: 4,
    color: "#404040",
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    width: 140,
    color: "#737373",
  },
  value: {
    flex: 1,
    color: "#171717",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#a3a3a3",
    textAlign: "center",
  },
});

export default function ExecutiveReportDocument({ data }: { data: ReportPayload }) {
  const { companyName, keyMetrics, keyRisks, stressSummary, disclosureSummary, recommendations, generatedAt } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Executive Risk Brief</Text>
        <Text style={styles.subtitle}>
          {companyName} · Generated {new Date(generatedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company overview</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Revenue</Text>
            <Text style={styles.value}>{formatCurrency(keyMetrics.revenue)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>EBITDA</Text>
            <Text style={styles.value}>{formatCurrency(keyMetrics.ebitda)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Debt</Text>
            <Text style={styles.value}>{formatCurrency(keyMetrics.debt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cash</Text>
            <Text style={styles.value}>{formatCurrency(keyMetrics.cash)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Equity</Text>
            <Text style={styles.value}>{formatCurrency(keyMetrics.equity)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key financial risks</Text>
          {keyRisks.length === 0 ? (
            <Text style={styles.body}>No specific risks quantified. Run stress tests and 10-K analysis to populate.</Text>
          ) : (
            keyRisks.map((r, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.body}>{r}</Text>
              </View>
            ))
          )}
        </View>

        {stressSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stress test impact summary</Text>
            <Text style={styles.body}>Scenario: {stressSummary.scenarioName}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Fragility score</Text>
              <Text style={styles.value}>{stressSummary.fragilityScore ?? "—"} / 100</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DSCR (baseline → stressed)</Text>
              <Text style={styles.value}>
                {stressSummary.baselineDscr != null ? stressSummary.baselineDscr.toFixed(2) : "—"} →{" "}
                {stressSummary.stressedDscr != null ? stressSummary.stressedDscr.toFixed(2) : "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Liquidity runway, months (baseline → stressed)</Text>
              <Text style={styles.value}>
                {stressSummary.baselineRunwayMonths != null ? stressSummary.baselineRunwayMonths.toFixed(1) : "—"} →{" "}
                {stressSummary.stressedRunwayMonths != null ? stressSummary.stressedRunwayMonths.toFixed(1) : "—"}
              </Text>
            </View>
          </View>
        )}

        {disclosureSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Disclosure sentiment analysis</Text>
            {disclosureSummary.fileName && (
              <Text style={styles.body}>Source: {disclosureSummary.fileName}</Text>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Disclosure risk score</Text>
              <Text style={styles.value}>{disclosureSummary.disclosureRiskScore ?? "—"} / 100</Text>
            </View>
            <Text style={[styles.body, { marginTop: 4 }]}>{disclosureSummary.executiveSummary || "No summary available."}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended risk mitigation actions</Text>
          {recommendations.length === 0 ? (
            <Text style={styles.body}>Review stress test and disclosure results to define actions.</Text>
          ) : (
            recommendations.map((r, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.body}>{r}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Capital Markets AI Lab · Risk intelligence platform · Confidential
        </Text>
      </Page>
    </Document>
  );
}
