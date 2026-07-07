using MeFriend.Api.Models.Invoices;

namespace MeFriend.Api.Mappers;

public static class InvoiceMapper
{
    public static InvoiceListItemDto ApplyOutstandingDefaults(InvoiceListItemDto invoice)
    {
        var paidAmount = invoice.PaidAmount ?? 0;
        var outstandingAmount = invoice.OutstandingAmount ?? invoice.TotalAmount - paidAmount;
        var paymentStatus = string.IsNullOrWhiteSpace(invoice.PaymentStatus)
            ? ResolvePaymentStatus(paidAmount, outstandingAmount)
            : invoice.PaymentStatus;

        return new InvoiceListItemDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            CustomerCode = invoice.CustomerCode,
            CustomerName = invoice.CustomerName,
            SalesOrderNumber = invoice.SalesOrderNumber,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            TotalAmount = invoice.TotalAmount,
            PaidAmount = invoice.PaidAmount,
            OutstandingAmount = outstandingAmount,
            PaymentStatus = paymentStatus,
            InvoiceStatus = invoice.InvoiceStatus,
            CurrencyCode = invoice.CurrencyCode
        };
    }

    private static string ResolvePaymentStatus(decimal paidAmount, decimal outstandingAmount)
    {
        if (outstandingAmount <= 0)
        {
            return "Paid";
        }

        if (paidAmount > 0 && outstandingAmount > 0)
        {
            return "Partially Paid";
        }

        if (paidAmount <= 0 && outstandingAmount > 0)
        {
            return "Unpaid";
        }

        return "Unknown";
    }
}
