using System.Text.Json.Serialization;

namespace MeFriend.Api.Models.Customers;

public sealed class BusinessCentralCustomerCreatePayload
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("name2")]
    public string Name2 { get; init; } = string.Empty;

    [JsonPropertyName("address")]
    public string Address { get; init; } = string.Empty;

    [JsonPropertyName("stateCode")]
    public string StateCode { get; init; } = string.Empty;

    [JsonPropertyName("countryRegionCode")]
    public string CountryRegionCode { get; init; } = string.Empty;

    [JsonPropertyName("city")]
    public string City { get; init; } = string.Empty;

    [JsonPropertyName("postCode")]
    public string PostCode { get; init; } = string.Empty;

    [JsonPropertyName("locationCode")]
    public string LocationCode { get; init; } = string.Empty;

    [JsonPropertyName("pANNo")]
    public string PANNo { get; init; } = string.Empty;

    [JsonPropertyName("gstRegistrationNo")]
    public string GstRegistrationNo { get; init; } = string.Empty;

    [JsonPropertyName("deviceId")]
    public string DeviceId { get; init; } = string.Empty;

    [JsonPropertyName("regionCode")]
    public string RegionCode { get; init; } = string.Empty;

    [JsonPropertyName("incode")]
    public string Incode { get; init; } = string.Empty;

    [JsonPropertyName("genPostingGroup")]
    public string GenPostingGroup { get; init; } = string.Empty;

    [JsonPropertyName("customerPostingGroup")]
    public string CustomerPostingGroup { get; init; } = string.Empty;

    [JsonPropertyName("gstCustomerType")]
    public string GstCustomerType { get; init; } = string.Empty;

    [JsonPropertyName("applicationMethod")]
    public string ApplicationMethod { get; init; } = string.Empty;

    [JsonPropertyName("paymentMethodCode")]
    public string PaymentMethodCode { get; init; } = string.Empty;

    [JsonPropertyName("custDimensions")]
    public IReadOnlyCollection<CustomerDimensionPayload> CustDimensions { get; init; } =
        Array.Empty<CustomerDimensionPayload>();
}

public sealed class CustomerDimensionPayload
{
    [JsonPropertyName("dimensionCode")]
    public string DimensionCode { get; init; } = string.Empty;

    [JsonPropertyName("dimensionValueCode")]
    public string DimensionValueCode { get; init; } = string.Empty;
}
