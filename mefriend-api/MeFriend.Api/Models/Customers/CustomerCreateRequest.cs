namespace MeFriend.Api.Models.Customers;

public sealed class CustomerCreateRequest
{
    public string Branch { get; init; } = string.Empty;
    public string Department { get; init; } = string.Empty;
    public string CustomerCode { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string StateCode { get; init; } = string.Empty;
    public string CountryCode { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string PostCode { get; init; } = string.Empty;
    public string LocationCode { get; init; } = string.Empty;
    public string PanNo { get; init; } = string.Empty;
    public string GstNo { get; init; } = string.Empty;
}
