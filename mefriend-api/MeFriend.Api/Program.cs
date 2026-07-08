using MeFriend.Api.Clients;
using MeFriend.Api.Middleware;
using MeFriend.Api.Options;
using MeFriend.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add(new AuthorizeFilter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient(nameof(BusinessCentralAuthService));
builder.Services.AddHttpClient(nameof(BusinessCentralHttpClient));

builder.Services
    .AddOptions<BusinessCentralOptions>()
    .Bind(builder.Configuration.GetSection(BusinessCentralOptions.SectionName))
    .Validate(BusinessCentralOptionsValidator.Validate, BusinessCentralOptionsValidator.FailureMessage)
    .ValidateOnStart();

builder.Services
    .AddOptions<AzureAdOptions>()
    .Bind(builder.Configuration.GetSection(AzureAdOptions.SectionName))
    .Validate(AzureAdOptionsValidator.Validate, AzureAdOptionsValidator.FailureMessage)
    .ValidateOnStart();

builder.Services
    .AddOptions<SecurityOptions>()
    .Bind(builder.Configuration.GetSection(SecurityOptions.SectionName))
    .Validate(SecurityOptionsValidator.Validate, SecurityOptionsValidator.FailureMessage)
    .ValidateOnStart();

var allowedOrigins = builder.Configuration
    .GetSection($"{SecurityOptions.SectionName}:AllowedCorsOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("SharePointOrigins", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var azureAdOptions = builder.Configuration
    .GetSection(AzureAdOptions.SectionName)
    .Get<AzureAdOptions>() ?? new AzureAdOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = AzureAdOptionsValidator.BuildAuthority(azureAdOptions);
        options.Audience = azureAdOptions.GetAudience();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
        };
    });

builder.Services.AddAuthorization(options =>
{
    var authenticatedUsers = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.DefaultPolicy = authenticatedUsers;
    options.FallbackPolicy = authenticatedUsers;
});

builder.Services.AddScoped<IBusinessCentralHttpClient, BusinessCentralHttpClient>();
builder.Services.AddSingleton<IBusinessCentralAuthService, BusinessCentralAuthService>();
builder.Services.AddScoped<IBusinessCentralCustomerService, BusinessCentralCustomerService>();
builder.Services.AddScoped<IBusinessCentralEventService, BusinessCentralEventService>();
builder.Services.AddScoped<IBusinessCentralSalespersonService, BusinessCentralSalespersonService>();
builder.Services.AddScoped<IBusinessCentralInvoiceService, BusinessCentralInvoiceService>();
builder.Services.AddScoped<IBusinessCentralSalesOrderService, BusinessCentralSalesOrderService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // OpenAPI is intentionally development-only. Do not map Swagger/OpenAPI in production.
    app.MapOpenApi();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseHttpsRedirection();
app.UseCors("SharePointOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
