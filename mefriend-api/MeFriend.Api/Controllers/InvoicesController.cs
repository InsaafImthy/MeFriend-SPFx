using MeFriend.Api.Models.Invoices;
using MeFriend.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MeFriend.Api.Controllers;

[ApiController]
[Route("api/invoices")]
public sealed class InvoicesController : ControllerBase
{
    private readonly IBusinessCentralInvoiceService _invoiceService;

    public InvoicesController(IBusinessCentralInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] InvoiceFilterRequest request, CancellationToken cancellationToken)
    {
        var response = await _invoiceService.GetInvoicesAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var response = await _invoiceService.GetInvoiceByIdAsync(id, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("outstanding")]
    public async Task<IActionResult> GetOutstanding(
        [FromQuery] InvoiceFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _invoiceService.GetOutstandingInvoicesAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("by-sales-order/{salesOrderId}")]
    public async Task<IActionResult> GetBySalesOrder(
        string salesOrderId,
        [FromQuery] InvoiceFilterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _invoiceService.GetInvoicesBySalesOrderIdAsync(
            salesOrderId,
            request,
            cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }
}
