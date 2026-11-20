import { useMemo } from 'react';
import Icon from '../../components/Icon';
import { getRequestFeeAmount } from '../../models/fees';

function formatAmount(amount) {
  return `M${amount.toFixed(2)}`;
}

function getStudentKey(request) {
  return request.email?.trim().toLowerCase()
    || request.studentId?.trim()
    || request.id;
}

function buildFinanceSummary(requests) {
  const feeRequests = requests
    .map((request) => ({ ...request, amount: getRequestFeeAmount(request) }))
    .filter((request) => request.amount > 0);
  const paidRequests = feeRequests.filter((request) => request.feeStatus === 'Paid');
  const owingRequests = feeRequests.filter((request) => request.feeStatus !== 'Paid');
  const owingStudents = new Map();

  owingRequests.forEach((request) => {
    const key = getStudentKey(request);
    const student = owingStudents.get(key) || {
      key,
      name: request.studentName || 'Student name unavailable',
      studentId: request.studentId || '',
      email: request.email || '',
      amount: 0,
      requests: [],
    };
    student.amount += request.amount;
    student.requests.push(request);
    owingStudents.set(key, student);
  });

  return {
    feeRequests,
    paidRequests,
    owingRequests,
    totalPaid: paidRequests.reduce((total, request) => total + request.amount, 0),
    totalOwing: owingRequests.reduce((total, request) => total + request.amount, 0),
    owingStudents: [...owingStudents.values()].sort((first, second) => second.amount - first.amount),
  };
}

export default function AdminFinancePage({ requests }) {
  const summary = useMemo(() => buildFinanceSummary(requests), [requests]);
  const totalAmount = summary.totalPaid + summary.totalOwing;
  const paidAmountPercent = totalAmount ? (summary.totalPaid / totalAmount) * 100 : 0;
  const outstandingAmountPercent = totalAmount ? (summary.totalOwing / totalAmount) * 100 : 0;
  const maximumCount = Math.max(summary.paidRequests.length, summary.owingRequests.length, 1);
  const paidCountPercent = (summary.paidRequests.length / maximumCount) * 100;
  const owingCountPercent = (summary.owingRequests.length / maximumCount) * 100;

  return (
    <section className="admin-finance" aria-labelledby="admin-finance-heading">
      <div className="finance-overview-grid">
        <article className="finance-stat">
          <span className="finance-stat-icon"><Icon name="wallet" size={18} /></span>
          <span>Total outstanding</span>
          <strong>{formatAmount(summary.totalOwing)}</strong>
          <small>{summary.owingRequests.length} unpaid service {summary.owingRequests.length === 1 ? 'fee' : 'fees'}</small>
        </article>
        <article className="finance-stat">
          <span className="finance-stat-icon paid"><Icon name="chart" size={18} /></span>
          <span>Total collected</span>
          <strong>{formatAmount(summary.totalPaid)}</strong>
          <small>{summary.paidRequests.length} paid service {summary.paidRequests.length === 1 ? 'fee' : 'fees'}</small>
        </article>
        <article className="finance-stat">
          <span className="finance-stat-icon owing"><Icon name="user" size={18} /></span>
          <span>Students owing</span>
          <strong>{summary.owingStudents.length}</strong>
          <small>With one or more outstanding fees</small>
        </article>
        <article className="finance-stat">
          <span className="finance-stat-icon"><Icon name="document" size={18} /></span>
          <span>Fee-bearing requests</span>
          <strong>{summary.feeRequests.length}</strong>
          <small>Paid and outstanding</small>
        </article>
      </div>

      <div className="finance-analytics-grid">
        <article className="finance-panel">
          <div className="finance-panel-heading">
            <div><span className="eyebrow">PAYMENT SUMMARY</span><h2 id="admin-finance-heading">Paid vs. outstanding</h2></div>
            <strong>{formatAmount(totalAmount)}</strong>
          </div>
          {totalAmount ? (
            <>
              <div
                className="finance-amount-chart"
                role="img"
                aria-label={`Fee totals: ${formatAmount(summary.totalPaid)} paid, ${formatAmount(summary.totalOwing)} outstanding`}
              >
                <span className="finance-amount-paid" style={{ width: `${paidAmountPercent}%` }} />
                <span className="finance-amount-owing" style={{ width: `${outstandingAmountPercent}%` }} />
              </div>
              <div className="finance-chart-legend">
                <span><i className="finance-legend-dot paid" />Paid <strong>{formatAmount(summary.totalPaid)}</strong></span>
                <span><i className="finance-legend-dot owing" />Outstanding <strong>{formatAmount(summary.totalOwing)}</strong></span>
              </div>
            </>
          ) : (
            <p className="finance-empty">Payment graphs will appear when fee-bearing requests are recorded.</p>
          )}
        </article>

        <article className="finance-panel">
          <div className="finance-panel-heading">
            <div><span className="eyebrow">REQUEST COUNTS</span><h2>Payment status</h2></div>
            <span className="finance-chart-note">By recorded fee status</span>
          </div>
          <div
            className="finance-count-chart"
            role="img"
            aria-label={`Payment status counts: ${summary.paidRequests.length} paid, ${summary.owingRequests.length} outstanding`}
          >
            <div className="finance-count-column">
              <span className="finance-count-value">{summary.paidRequests.length}</span>
              <div className="finance-count-track"><span className="finance-count-paid" style={{ height: `${paidCountPercent}%` }} /></div>
              <strong>Paid</strong>
            </div>
            <div className="finance-count-column">
              <span className="finance-count-value">{summary.owingRequests.length}</span>
              <div className="finance-count-track"><span className="finance-count-owing" style={{ height: `${owingCountPercent}%` }} /></div>
              <strong>Outstanding</strong>
            </div>
          </div>
          <p className="finance-chart-note">Amounts and counts reflect the latest fee statuses recorded by staff.</p>
        </article>
      </div>

      <section className="finance-panel finance-owing-list" aria-labelledby="owing-students-heading">
        <div className="finance-panel-heading">
          <div><span className="eyebrow">FOLLOW UP</span><h2 id="owing-students-heading">Students with outstanding fees</h2></div>
          <strong>{summary.owingStudents.length} {summary.owingStudents.length === 1 ? 'student' : 'students'}</strong>
        </div>
        {summary.owingStudents.length ? (
          <div className="finance-student-table-wrap">
            <table className="finance-student-table">
              <thead><tr><th scope="col">Student</th><th scope="col">Student number</th><th scope="col">Unpaid services</th><th scope="col">Amount owed</th></tr></thead>
              <tbody>
                {summary.owingStudents.map((student) => (
                  <tr key={student.key}>
                    <td><strong>{student.name}</strong>{student.email && <small>{student.email}</small>}</td>
                    <td>{student.studentId || '—'}</td>
                    <td>{student.requests.map((request) => request.service).filter(Boolean).join(', ') || `${student.requests.length} service ${student.requests.length === 1 ? 'request' : 'requests'}`}</td>
                    <td className="finance-amount-owed">{formatAmount(student.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="finance-empty"><h3>No outstanding student fees</h3><p>Students with unpaid service fees will appear here.</p></div>
        )}
      </section>
    </section>
  );
}
